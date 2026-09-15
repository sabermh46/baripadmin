import { COLORS, LINE_STEP, PAGE, RADIUS, TYPE } from './theme';
import { drawBrandMark } from './brandMark';

/**
 * Reusable document blocks.
 *
 * Each one takes a surface and an absolute position, draws itself, and reports how much
 * vertical space it used. Nothing here knows what a rent receipt is - which is the point.
 * A statement, a lease summary or an expense report is a different arrangement of these
 * same blocks, and inherits the branding, the Bengali handling and the page-break rules for
 * free rather than by being copied and edited.
 *
 * Every block returns `{ endY }` in mm so callers can chain them without tracking offsets.
 */

/**
 * Branded document header: logo, product name, document type, optional status pill and a
 * meta line, closed by a two-weight rule.
 *
 * The rule is two weights on purpose - a short brand stroke over a full hairline reads as
 * deliberate, where a single heavy orange line across the page reads as a divider someone
 * forgot to style.
 */
export function documentHeader(surface, {
  productName = 'Bari Porichalona',
  tagline = 'Smart Property Management Platform',
  documentType,
  badge = null,
  meta = null,
  y = 9,
} = {}) {
  const left = PAGE.marginX;
  const right = PAGE.width - PAGE.marginX;

  const mark = drawBrandMark(surface, left, y, 13);
  const textX = left + mark.width + 3;

  surface.text(productName, textX, y + 7.5, {
    size: TYPE.title, weight: 'bold', color: COLORS.ink,
  });
  surface.text(tagline, textX, y + 12, {
    size: TYPE.caption, color: COLORS.muted,
  });

  if (documentType) {
    surface.text(documentType, right, y + 5, {
      size: TYPE.documentType, weight: 'bold', color: COLORS.ink, align: 'right',
    });
  }

  if (badge) {
    const label = badge.label ?? badge;
    const padding = 3;
    const width = surface.measure(label, { size: TYPE.micro, weight: 'bold' }) + padding * 2;
    const badgeX = right - width;
    surface.rect(badgeX, y + 7.5, width, 5.4, {
      fill: badge.background ?? COLORS.successBg,
      radius: 2.7,
    });
    surface.text(label, badgeX + width / 2, y + 11.3, {
      size: TYPE.micro, weight: 'bold', color: badge.color ?? COLORS.successInk, align: 'center',
    });
  }

  if (meta) {
    surface.text(meta, right, y + 17, {
      size: TYPE.caption, color: COLORS.muted, align: 'right',
    });
  }

  const ruleY = y + 20;
  surface.line(left, ruleY, right, ruleY, { color: COLORS.line, width: 0.3 });
  surface.line(left, ruleY, left + 32, ruleY, { color: COLORS.brand, width: 1.1 });

  return { endY: ruleY };
}

/**
 * A labelled card: small brand-coloured caption, a bold heading, then stacked detail lines.
 *
 * `rows` entries may be a plain string or `{ text, size }`. A row whose text is empty or
 * null is skipped rather than leaving a gap, so a caller can pass optional fields inline
 * without filtering them first.
 */
export function detailPanel(surface, {
  x,
  y,
  width,
  height,
  label,
  heading,
  rows = [],
  fill = COLORS.tint,
  border = COLORS.tintBorder,
}) {
  const visible = rows
    .map((row) => (typeof row === 'string' ? { text: row } : row))
    .filter((row) => row && row.text);

  const panelHeight = height ?? panelHeightFor(visible.length);

  surface.rect(x, y, width, panelHeight, { fill, border });

  const padding = 4;
  surface.text(label, x + padding, y + 7, {
    size: TYPE.label, weight: 'bold', color: COLORS.brand,
  });
  surface.text(heading, x + padding, y + 14, {
    size: TYPE.sectionHeading + 0.5,
    weight: 'bold',
    color: COLORS.ink,
    maxWidth: width - padding * 2,
  });

  let rowY = y + 21;
  for (const row of visible) {
    surface.text(row.text, x + padding, rowY, {
      size: row.size ?? TYPE.bodySmall,
      color: COLORS.body,
      maxWidth: width - padding * 2,
    });
    rowY += LINE_STEP;
  }

  return { endY: y + panelHeight, height: panelHeight };
}

/** Height a detailPanel needs for `rowCount` detail lines: caption + heading + rows + padding. */
export function panelHeightFor(rowCount) {
  return Math.max(38, 7 + 7 + (rowCount + 1) * LINE_STEP + 4);
}

/**
 * A table: any number of columns, optional header and footer, page-breaks on its own.
 *
 * Two visual treatments, because the two documents that use it want opposite things:
 *
 *   'rules'  - hairline rules only, no fills. What the receipt uses. No fills anywhere is
 *              what lets the rounded frame sit cleanly around it; a solid header or a
 *              striped body would paint square corners inside the curve.
 *   'filled' - a solid header band with optional zebra striping, for a dense financial
 *              table where the eye needs help tracking a row across six columns.
 *
 * When it breaks across a page it redraws the header there. Each page's rows get their own
 * frame, because a single frame spanning a break would be drawn from a y on one page to a y
 * on another and render as a rectangle around nothing.
 *
 * @param {string[]}                    [head]     header cells
 * @param {Array<string[]|object>}       rows      cell arrays, or {cells, bold, fill, color}
 * @param {string[]}                    [foot]     a totals row, styled apart from the body
 * @param {Array<{width?:number, align?:string}>} [columns]
 *        `width` is a fraction of the table width; columns without one share what is left.
 * @param {(row:any, index:number) => object} [rowStyle] per-row {bold, fill, color} override
 */
export function dataTable(surface, {
  x,
  y,
  width,
  head,
  rows,
  foot,
  columns,
  variant = 'rules',
  headFill = COLORS.brand,
  headColor = COLORS.white,
  striped = false,
  stripeFill = COLORS.tint,
  footFill = '#f0f0f0',
  frame = variant === 'rules',
  fontSize = TYPE.body,
  headFontSize = TYPE.label,
  rowHeight = 8.4,
  padding = 5,
  rowStyle,
}) {
  const columnCount = head?.length ?? foot?.length ?? cellsOf(rows[0])?.length ?? 1;
  const layout = resolveColumns(columns, columnCount, width);
  const headerHeight = variant === 'filled' ? rowHeight : 6;

  let cursorY = y;
  let sectionTop = y;

  /** Draw one row of cells, each inside its own column box, vertically centred in `height`. */
  const drawCells = (cells, { bold, color, size, height = rowHeight }) => {
    cells.forEach((cell, index) => {
      const column = layout[index];
      if (!column) return;
      const align = column.align ?? (index === 0 ? 'left' : 'right');
      const anchorX = align === 'right'
        ? x + column.offset + column.width - padding
        : align === 'center'
          ? x + column.offset + column.width / 2
          : x + column.offset + padding;
      surface.text(cell, anchorX, cursorY + height / 2 + size * 0.14, {
        size,
        weight: bold ? 'bold' : 'normal',
        color,
        align,
        maxWidth: column.width - padding * 1.5,
      });
    });
  };

  const drawHeader = () => {
    if (!head) return;
    if (variant === 'filled') {
      surface.rect(x, cursorY, width, headerHeight, { fill: headFill, radius: 0 });
      drawCells(head, { bold: true, color: headColor, size: headFontSize, height: headerHeight });
      cursorY += headerHeight;
    } else {
      drawCells(head, { bold: true, color: COLORS.muted, size: headFontSize, height: headerHeight });
      cursorY += headerHeight;
      surface.line(x, cursorY, x + width, cursorY, { color: COLORS.line, width: 0.4 });
    }
  };

  const closeSection = () => {
    if (frame) {
      surface.rect(x, sectionTop - 1, width, (cursorY - sectionTop) + 2, {
        border: COLORS.line, radius: RADIUS,
      });
    }
  };

  drawHeader();

  rows.forEach((row, index) => {
    const cells = cellsOf(row);
    const style = { ...(typeof row === 'object' && !Array.isArray(row) ? row : {}), ...(rowStyle?.(row, index) ?? {}) };

    if (cursorY + rowHeight > PAGE.contentBottom) {
      closeSection();
      surface.addPage();
      cursorY = PAGE.marginTop;
      sectionTop = cursorY;
      drawHeader();
    }

    const fill = style.fill ?? (striped && index % 2 === 1 ? stripeFill : null);
    if (fill) surface.rect(x, cursorY, width, rowHeight, { fill, radius: 0 });

    drawCells(cells, {
      bold: style.bold,
      color: style.color ?? (style.bold ? COLORS.ink : COLORS.body),
      size: fontSize,
    });
    cursorY += rowHeight;

    if (variant === 'rules') {
      surface.line(x, cursorY, x + width, cursorY, { color: COLORS.line, width: 0.2 });
    }
  });

  if (foot) {
    if (cursorY + rowHeight > PAGE.contentBottom) {
      closeSection();
      surface.addPage();
      cursorY = PAGE.marginTop;
      sectionTop = cursorY;
      drawHeader();
    }
    surface.rect(x, cursorY, width, rowHeight, { fill: footFill, radius: 0 });
    drawCells(foot, { bold: true, color: COLORS.ink, size: fontSize });
    cursorY += rowHeight;
  }

  closeSection();
  return { endY: cursorY };
}

/** Cells of a row, whether it was given as a bare array or as {cells, ...style}. */
function cellsOf(row) {
  return Array.isArray(row) ? row : row?.cells ?? [];
}

/**
 * Turn column hints into absolute offsets and widths.
 *
 * `width` on a column is a FRACTION of the table, not millimetres, so a layout survives the
 * table being placed in a narrower space without every number being recalculated. Columns
 * without one split whatever the specified ones leave.
 */
function resolveColumns(columns, count, totalWidth) {
  const specs = Array.from({ length: count }, (_, i) => columns?.[i] ?? {});
  const fixed = specs.reduce((sum, c) => sum + (c.width ?? 0), 0);
  const flexible = specs.filter((c) => c.width == null).length;
  const share = flexible > 0 ? Math.max(0, 1 - fixed) / flexible : 0;

  let offset = 0;
  return specs.map((spec) => {
    const columnWidth = (spec.width ?? share) * totalWidth;
    const resolved = { offset, width: columnWidth, align: spec.align };
    offset += columnWidth;
    return resolved;
  });
}

/** Baseline-to-baseline step for the supporting lines under a highlight figure, in mm. */
const ROW_STEP = 5;

/**
 * The card that carries the headline figure, plus any supporting lines beneath it.
 *
 * Supporting detail belongs here, beside the amount, rather than in a panel at the top of
 * the page: it is what someone reconciling a payment is looking at when they need it.
 */
export function highlightCard(surface, {
  x,
  y,
  width,
  minHeight = 0,
  label,
  value,
  unit,
  rows = [],
}) {
  // The card sizes itself to its own content and only then honours `minHeight` (normally
  // the height of the table it sits beside). Fixing the height from outside is how the
  // transaction reference came to be silently dropped: the caller passed the table's
  // height, two supporting lines did not fit inside it, and the second was skipped with
  // nothing to show that it had been.
  const height = Math.max(minHeight, rows.length ? 28 + rows.length * ROW_STEP : 27);

  surface.rect(x, y, width, height, { fill: COLORS.tint, border: COLORS.tintBorderStrong });

  const padding = 6;
  surface.text(label, x + padding, y + 8, {
    size: TYPE.label, weight: 'bold', color: COLORS.brand,
  });
  surface.text(value, x + padding, y + 18, {
    size: TYPE.figure, weight: 'bold', color: COLORS.ink, maxWidth: width - padding * 2,
  });
  if (unit) {
    surface.text(unit, x + padding, y + 23, { size: TYPE.caption, color: COLORS.muted });
  }

  let rowY = y + 30;
  for (const row of rows) {
    if (!row?.text) continue;
    surface.text(row.text, x + padding, rowY, {
      size: row.size ?? TYPE.bodySmall,
      color: row.color ?? COLORS.body,
      maxWidth: width - padding * 2,
    });
    rowY += ROW_STEP;
  }

  return { endY: y + height, height };
}

/**
 * A free-text block in a bordered panel - the owner's note, terms, a disclaimer.
 *
 * Measured before anything is drawn so the whole block can move to a new page as a unit.
 * The old hand-drawn version had no such check and, with enough rows above it, ran straight
 * through the footer rule and off the bottom of the page.
 */
export function noteBlock(surface, { x, y, width, heading, text, size = TYPE.body }) {
  const padding = 4;
  const textWidth = width - padding * 2;
  const step = surface.lineHeight(size) * 1.3;
  const lines = surface.wrap(text, textWidth, { size });
  const boxHeight = lines.length * step + 9;

  let top = y;
  if (top + 3 + boxHeight > PAGE.contentBottom) {
    surface.addPage();
    top = PAGE.marginTop;
  }

  if (heading) {
    surface.text(heading, x, top, {
      size: TYPE.sectionHeading, weight: 'bold', color: COLORS.ink,
    });
  }

  surface.rect(x, top + 3, width, boxHeight, { fill: COLORS.panel, border: COLORS.line });
  surface.paragraph(text, x + padding, top + 6, {
    width: textWidth, size, color: COLORS.body, lineHeight: step,
  });

  return { endY: top + 3 + boxHeight };
}

/**
 * A row of labelled facts across the page - "OWNER / SCOPE / GENERATED", "BILL TO / SHIP TO".
 *
 * Each fact is a small uppercase label with one or more values stacked under it. Values wrap
 * inside their own column rather than running into the next one, which is what went wrong
 * when this was drawn as bare text at hardcoded x positions: a long owner name simply
 * overlapped the scope beside it.
 *
 * @param {Array<{label: string, values: Array<string|false|null|undefined>}>} facts
 */
export function factRow(surface, { x, y, width, facts, gap = 6 }) {
  const columnWidth = (width - gap * (facts.length - 1)) / facts.length;
  let tallest = 0;

  facts.forEach((fact, index) => {
    const columnX = x + index * (columnWidth + gap);
    surface.text(fact.label, columnX, y, {
      size: TYPE.label, weight: 'bold', color: COLORS.muted,
    });

    let valueY = y + 4.5;
    for (const value of fact.values.filter(Boolean)) {
      const drawn = surface.paragraph(value, columnX, valueY, {
        width: columnWidth,
        size: TYPE.bodySmall,
        color: COLORS.body,
        lineHeight: 4.2,
        maxLines: 2,
      });
      valueY += drawn.height + 0.6;
    }
    tallest = Math.max(tallest, valueY - y);
  });

  return { endY: y + tallest };
}

/** A section heading above a block. */
export function sectionHeading(surface, text, x, y, { size = TYPE.sectionHeading, color = COLORS.ink } = {}) {
  surface.text(text, x, y, { size, weight: 'bold', color });
  return { endY: y };
}

/** A small italic aside - a caveat under a table, a note about how a figure was derived. */
export function footnote(surface, text, x, y, { width, size = TYPE.micro + 0.5 } = {}) {
  return surface.paragraph(text, x, y, {
    width, size, weight: 'italic', color: COLORS.muted, lineHeight: size * 0.42,
  });
}

/**
 * Footer rule and centred caption on every page, with page numbering.
 *
 * Run last: it needs the final page count, which is only known once the body has finished
 * laying itself out.
 */
export function pageFooter(surface, { parts = [], caption = null, margin = PAGE.marginX, rule = true } = {}) {
  const left = margin;
  const right = PAGE.width - margin;

  surface.onEveryPage((pageNumber, pageCount) => {
    if (rule) {
      surface.line(left, PAGE.footerRuleY, right, PAGE.footerRuleY, {
        color: COLORS.line, width: 0.25,
      });
    }

    // `caption` splits the footer - a long description on the left, the page number hard
    // right - where `parts` centres one run of text. A wide report needs the first: its
    // caption names the owner, scope and period and would otherwise run under the page
    // number in the middle of the page.
    if (caption) {
      surface.text(caption, left, PAGE.footerTextY, {
        size: TYPE.label, color: COLORS.muted, maxWidth: right - left - 30,
      });
      surface.text(`Page ${pageNumber} of ${pageCount}`, right, PAGE.footerTextY, {
        size: TYPE.label, color: COLORS.muted, align: 'right',
      });
      return;
    }

    const line = [...parts, `Page ${pageNumber} of ${pageCount}`].join('   ·   ');
    surface.text(line, PAGE.width / 2, PAGE.footerTextY, {
      size: TYPE.label, color: COLORS.muted, align: 'center',
    });
  });
}
