import { COLORS, PAGE, RADIUS } from './theme';
import { embedBengaliFonts, needsComplexScript, splitScriptRuns, toLatin1Safe } from './fonts';

/**
 * A drawing surface over pdf-lib, in the coordinate system documents are actually designed
 * in: millimetres, origin top-left, y increasing downward.
 *
 * pdf-lib speaks PDF points with the origin at the BOTTOM-left, which means every single
 * y in a layout has to be flipped by hand. Doing that at each call site is how a layout
 * ends up with a panel drawn 3mm off from the text inside it. It is flipped once, here.
 *
 * The surface is deliberately stateless per call - every method takes the size, weight and
 * colour it draws with. jsPDF's setFontSize/setFont/setTextColor model leaks state between
 * unrelated blocks: forget one setter and a heading silently inherits the previous block's
 * 6.8pt muted grey. With explicit options a block cannot be affected by whatever ran before
 * it, which is what makes these blocks safe to reuse across different documents.
 */

const MM_PER_PT = 25.4 / 72;
const PT_PER_MM = 72 / 25.4;

/** Millimetres to PDF points. */
export const mmToPt = (mm) => mm * PT_PER_MM;
/** PDF points to millimetres. */
export const ptToMm = (pt) => pt * MM_PER_PT;

/** Kappa: the cubic-Bezier constant that approximates a quarter circle. */
const KAPPA = 0.5522847498;

/**
 * pdf-lib is ~230 kB and is only needed once someone actually generates a document.
 *
 * Imported statically it landed in the route chunk of every screen that can produce a PDF -
 * the flat details page carried the whole library just to be opened, for a receipt most
 * visits never generate. Cached here so a second document in the same session is instant.
 */
let pdfLibPromise = null;
const loadPdfLib = () => (pdfLibPromise ??= import('pdf-lib'));

/** #rgb or #rrggbb to a pdf-lib colour. `rgb` comes from the lazily-loaded module. */
function makeHexToRgb(rgb) {
  return (hex) => {
    const value = String(hex).replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const int = parseInt(full, 16);
    return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
  };
}

/**
 * A rounded rectangle as a cubic-Bezier path in y-down space.
 *
 * Cubics rather than SVG arc (`A`) commands on purpose: arcs are the part of the path
 * grammar most likely to differ between parsers, and a corner that silently renders as a
 * straight line is the kind of thing nobody notices until it is in a customer's inbox.
 */
function roundedRectPath(width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) return `M 0 0 H ${width} V ${height} H 0 Z`;
  const c = r * KAPPA;
  return [
    `M ${r} 0`,
    `H ${width - r}`,
    `C ${width - r + c} 0 ${width} ${r - c} ${width} ${r}`,
    `V ${height - r}`,
    `C ${width} ${height - r + c} ${width - r + c} ${height} ${width - r} ${height}`,
    `H ${r}`,
    `C ${r - c} ${height} 0 ${height - r + c} 0 ${height - r}`,
    `V ${r}`,
    `C 0 ${r - c} ${r - c} 0 ${r} 0`,
    'Z',
  ].join(' ');
}

/**
 * Target width of a word space in the embedded Bengali face, as a fraction of the em.
 *
 * Anek Bangla sets its space at 0.179 em where Helvetica uses 0.278 - about a third narrower.
 * At a glance that reads as words running into each other, and a full paragraph of Bengali
 * prose becomes noticeably harder to scan than the same paragraph of Latin beside it. Spaces
 * in a Bengali run are padded out to this instead.
 *
 * It is applied by the positioning code rather than by the PDF's own word-spacing operator
 * (Tw), which by specification only affects single-byte code 32 - and an embedded subset is
 * a composite font with two-byte codes, so Tw would do nothing at all here.
 */
const WORD_SPACE_EM = 0.27;

/**
 * Advance for one shaped glyph, in font units, including any word-space padding.
 *
 * Shared by drawing and measuring on purpose: if the two ever disagreed, right-aligned text
 * and wrapped paragraphs would drift by exactly the padding this adds.
 */
function glyphAdvance(glyph, position, unitsPerEm) {
  const advance = position.xAdvance;
  if (!glyph?.codePoints?.includes(0x20)) return advance;
  return Math.max(advance, WORD_SPACE_EM * unitsPerEm);
}

/**
 * Create a document surface.
 *
 * @param {object}  [options]
 * @param {*}       [options.content]  Anything the document will print. Scanned once for
 *                                     Bengali so the font download happens only when the
 *                                     document actually contains some. Pass the whole data
 *                                     payload; it is walked recursively.
 * @param {boolean} [options.bengali]  Force the Bengali faces on or off, bypassing the scan.
 */
export async function createSurface({ content, bengali } = {}) {
  const {
    PDFDocument, StandardFonts, rgb, PDFHexString,
    pushGraphicsState, popGraphicsState, beginText, endText,
    setFillingColor, setFontAndSize, moveText, showText,
    rotateAndSkewTextRadiansAndTranslate,
  } = await loadPdfLib();
  const hexToRgb = makeHexToRgb(rgb);

  const pdfDoc = await PDFDocument.create();

  // `face` is the fontkit handle used for positioning, and is null for the built-in Latin
  // faces - they need none, and pdf-lib draws them correctly on its own.
  const standard = {
    normal: { pdf: await pdfDoc.embedFont(StandardFonts.Helvetica), face: null },
    bold: { pdf: await pdfDoc.embedFont(StandardFonts.HelveticaBold), face: null },
    italic: { pdf: await pdfDoc.embedFont(StandardFonts.HelveticaOblique), face: null },
  };

  // Loading the Bengali faces must never be the reason a receipt fails to generate. If the
  // fetch or the embed falls over we carry on with the Latin faces and let `text()` fall
  // back to toLatin1Safe - a receipt with "?" where a name should be is still a receipt the
  // tenant can use, and the amounts on it are still right.
  let complex = null;
  const wantsBengali = bengali ?? needsComplexScript(content);
  if (wantsBengali) {
    try {
      complex = await embedBengaliFonts(pdfDoc);
    } catch (err) {
      console.error('Bengali font unavailable; falling back to Latin faces.', err);
      complex = null;
    }
  }

  const pages = [pdfDoc.addPage([mmToPt(PAGE.width), mmToPt(PAGE.height)])];
  let current = 0;

  const page = () => pages[current];
  /** Flip a top-down mm y into pdf-lib's bottom-up points. */
  const flip = (y) => mmToPt(PAGE.height - y);

  /**
   * Which face draws this RUN.
   *
   * Per run, not per string. Handing a whole mixed line to the Bengali face looks like the
   * tidier choice and is the wrong one: fontkit picks its shaper from the first strong
   * character, so "Owner: <bengali name>" is shaped as Latin and the Bengali silently loses
   * its mark positioning. splitScriptRuns exists to prevent exactly that.
   *
   * Keeping the Latin parts on the built-in face also keeps the embedded subset small - it
   * only ever carries glyphs that were actually written in Bengali.
   */
  /** Latin faces throw on anything they cannot encode, so sanitise before handing them text. */
  const encodable = (text, entry) => (entry.face ? String(text ?? '') : toLatin1Safe(text));

  const entryFor = (isComplex, weight) => {
    // Bengali has no italic here - Anek Bangla ships upright weights only - so an italic
    // aside falls back to the upright Bengali face rather than being refused or faked by
    // slanting the outlines, which is not how Bengali is emphasised anyway.
    if (isComplex && complex) return complex[weight] ?? complex.normal;
    return standard[weight] ?? standard.normal;
  };

  /** Width of a single already-classified run, in mm. */
  const measureRun = (text, entry, size) => {
    const value = encodable(text, entry);
    try {
      if (entry.face) {
        // The shaper's advances, not the font's default ones. pdf-lib's own
        // widthOfTextAtSize sums hmtx widths and so disagrees with what actually gets
        // drawn - which is how a right-aligned Bengali figure ends up off its column.
        const run = entry.face.layout(value);
        const units = run.positions.reduce(
          (total, position, index) => total + glyphAdvance(run.glyphs[index], position, entry.face.unitsPerEm),
          0,
        );
        return ptToMm((units / entry.face.unitsPerEm) * size);
      }
      return ptToMm(entry.pdf.widthOfTextAtSize(value, size));
    } catch {
      // An unencodable character slipped through; a zero width is better than a throw.
      return 0;
    }
  };

  /**
   * Draw a run through the embedded face, placing every glyph where the shaper says.
   *
   * WHY THIS IS NOT page.drawText()
   * -------------------------------
   * pdf-lib applies GSUB and stops. It asks fontkit to shape the string, writes the
   * resulting glyph ids, and throws the POSITIONS away - so every glyph lands at its default
   * advance from the font's hmtx table.
   *
   * For Latin that is invisible; all it costs is kerning. For Bengali it is the difference
   * between a name and a misspelling. In Anek Bangla the u-matra of a word like "mahmud" is
   * a zero-width mark that GPOS pulls back under its consonant with xOffset -1171. Ignore
   * that and the mark is drawn where the pen happens to be - after the following consonant -
   * so the word renders with its vowel sign hanging off the wrong letter.
   *
   * So the text operators are emitted by hand: Tm to place the run, then one Td + Tj per
   * glyph, stepping by the shaper's own advances and offsets. `encodeText` still does the
   * subsetting and the ToUnicode mapping, so the text stays selectable and searchable - it
   * is only the placement that is taken over.
   *
   * @returns {boolean} false if the run could not be positioned, so the caller can fall back
   */
  const drawPositionedText = (entry, text, xPt, yPt, size, color) => {
    const run = entry.face.layout(text);
    if (!run.glyphs.length) return true;

    // encodeText registers the glyphs in the subset and returns their subset ids in shaped
    // order - the same order our own layout() produced, because it is the same font and the
    // same shaper. Four hex digits each; anything else means the two runs disagree, and a
    // mispaired glyph would be worse than an unpositioned one.
    const hex = entry.pdf.encodeText(text).value;
    if (hex.length !== run.glyphs.length * 4) return false;

    const target = page();
    target.setFont(entry.pdf);
    const [, fontKey] = target.getFont();

    const scale = size / entry.face.unitsPerEm;
    const operators = [
      pushGraphicsState(),
      beginText(),
      setFillingColor(color),
      setFontAndSize(fontKey, size),
      rotateAndSkewTextRadiansAndTranslate(0, 0, 0, xPt, yPt),
    ];

    // Td shifts the LINE matrix, and each Tj starts from it, so consecutive Td operands are
    // deltas between glyph origins rather than absolute positions.
    let penX = 0;
    let lastX = 0;
    let lastY = 0;
    run.positions.forEach((position, index) => {
      const glyphX = penX + position.xOffset * scale;
      const glyphY = position.yOffset * scale;
      operators.push(moveText(glyphX - lastX, glyphY - lastY));
      operators.push(showText(PDFHexString.of(hex.slice(index * 4, index * 4 + 4))));
      lastX = glyphX;
      lastY = glyphY;
      penX += glyphAdvance(run.glyphs[index], position, entry.face.unitsPerEm) * scale;
    });

    operators.push(endText(), popGraphicsState());
    target.pushOperators(...operators);
    return true;
  };

  const surface = {
    /** The raw pdf-lib document, for anything this surface deliberately does not wrap. */
    pdfDoc,

    get pageCount() {
      return pages.length;
    },

    /** Width of a string as it will actually be drawn, in mm. Shaping included. */
    measure(text, { size = 9, weight = 'normal' } = {}) {
      return splitScriptRuns(text).reduce(
        (total, run) => total + measureRun(run.text, entryFor(run.complex, weight), size),
        0,
      );
    },

    /** Line height for a given point size, in mm. */
    lineHeight(size = 9) {
      return ptToMm(size * 1.15);
    },

    /**
     * Break `text` into lines that fit `width` mm.
     *
     * Wraps on whitespace first, then hard-breaks any single token that still overflows (a
     * long URL, or Bengali written without spaces). The hard break walks GRAPHEME clusters,
     * not code points: splitting Bengali by code point can cut a consonant away from its
     * matra or hasant, leaving a line ending in a dangling vowel sign and the next line
     * starting with an orphaned mark.
     */
    wrap(text, width, { size = 9, weight = 'normal', maxLines } = {}) {
      const body = String(text ?? '');
      const lines = [];

      for (const paragraph of body.split(/\r?\n/)) {
        if (!paragraph.trim()) {
          lines.push('');
          continue;
        }
        let line = '';
        for (const word of paragraph.trim().split(/\s+/)) {
          const candidate = line ? `${line} ${word}` : word;
          if (surface.measure(candidate, { size, weight }) <= width) {
            line = candidate;
            continue;
          }
          if (line) lines.push(line);
          if (surface.measure(word, { size, weight }) <= width) {
            line = word;
            continue;
          }
          let chunk = '';
          for (const cluster of graphemes(word)) {
            if (chunk && surface.measure(chunk + cluster, { size, weight }) > width) {
              lines.push(chunk);
              chunk = cluster;
            } else {
              chunk += cluster;
            }
          }
          line = chunk;
        }
        lines.push(line);
      }

      if (maxLines && lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        kept[maxLines - 1] = fit(kept[maxLines - 1], width, { size, weight });
        return kept;
      }
      return lines;
    },

    /**
     * Draw one line of text with its BASELINE at `y`.
     *
     * @param {string} text
     * @param {number} x   mm from the left edge; the anchor named by `align`
     * @param {number} y   mm from the top edge, to the baseline
     */
    text(text, x, y, {
      size = 9,
      weight = 'normal',
      color = COLORS.body,
      align = 'left',
      maxWidth,
    } = {}) {
      let value = String(text ?? '');
      if (!value) return;

      if (maxWidth) value = fit(value, maxWidth, { size, weight });

      // One line can be several runs - "Owner: <bengali name>" is Latin then Bengali - and
      // each is drawn with its own face, laid end to end.
      const runs = splitScriptRuns(value).map((part) => {
        const entry = entryFor(part.complex, weight);
        const safe = encodable(part.text, entry);
        return { entry, safe, width: measureRun(part.text, entry, size) };
      });

      const total = runs.reduce((sum, run) => sum + run.width, 0);
      let cursor = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;

      const yPt = flip(y);
      const paint = hexToRgb(color);

      for (const run of runs) {
        const xPt = mmToPt(cursor);
        if (!run.entry.face || !drawPositionedText(run.entry, run.safe, xPt, yPt, size, paint)) {
          page().drawText(run.safe, { x: xPt, y: yPt, size, font: run.entry.pdf, color: paint });
        }
        cursor += run.width;
      }
    },

    /**
     * Draw wrapped text from a top edge rather than a baseline, and report the height used.
     *
     * Returns the block height in mm so the caller can lay out what follows without
     * re-deriving the line count.
     */
    paragraph(text, x, y, {
      width,
      size = 9,
      weight = 'normal',
      color = COLORS.body,
      lineHeight,
      align = 'left',
      maxLines,
    } = {}) {
      const step = lineHeight ?? surface.lineHeight(size) * 1.25;
      const lines = surface.wrap(text, width, { size, weight, maxLines });
      // ~0.8em below the line-box top is where an alphabetic baseline sits; Bengali needs
      // the room above it for matras and below it for descenders, which the step provides.
      const firstBaseline = y + size * MM_PER_PT * 0.8;

      lines.forEach((line, index) => {
        if (!line) return;
        const anchorX = align === 'right' ? x + width : align === 'center' ? x + width / 2 : x;
        surface.text(line, anchorX, firstBaseline + index * step, { size, weight, color, align });
      });

      return { height: lines.length * step, lines: lines.length };
    },

    line(x1, y1, x2, y2, { color = COLORS.line, width = 0.25 } = {}) {
      page().drawLine({
        start: { x: mmToPt(x1), y: flip(y1) },
        end: { x: mmToPt(x2), y: flip(y2) },
        thickness: mmToPt(width),
        color: hexToRgb(color),
      });
    },

    /**
     * A rectangle, rounded by default, positioned by its TOP-left corner.
     * Pass `radius: 0` for a square one, `fill: null` or `border: null` to omit either.
     */
    rect(x, y, width, height, {
      fill = null,
      border = null,
      borderWidth = 0.25,
      radius = RADIUS,
    } = {}) {
      if (!fill && !border) return;
      page().drawSvgPath(roundedRectPath(width, height, radius), {
        x: mmToPt(x),
        y: flip(y),
        scale: PT_PER_MM,
        color: fill ? hexToRgb(fill) : undefined,
        borderColor: border ? hexToRgb(border) : undefined,
        borderWidth: border ? mmToPt(borderWidth) : 0,
      });
    },

    /**
     * Draw an SVG path in y-down space, anchored at (x, y) in mm.
     * `unitsPerMm` says how many path units make one millimetre, so artwork keeps its own
     * viewBox coordinates instead of being pre-scaled by the caller.
     */
    svgPath(path, x, y, { fill = COLORS.ink, unitsPerMm = 1 } = {}) {
      page().drawSvgPath(path, {
        x: mmToPt(x),
        y: flip(y),
        scale: PT_PER_MM / unitsPerMm,
        color: hexToRgb(fill),
        borderWidth: 0,
      });
    },

    /** Embed a PNG (Uint8Array or data URL) with its top-left corner at (x, y). */
    async image(png, x, y, width, height) {
      const embedded = await pdfDoc.embedPng(png);
      page().drawImage(embedded, {
        x: mmToPt(x),
        y: flip(y + height),
        width: mmToPt(width),
        height: mmToPt(height),
      });
    },

    addPage() {
      pages.push(pdfDoc.addPage([mmToPt(PAGE.width), mmToPt(PAGE.height)]));
      current = pages.length - 1;
      return current;
    },

    /** Run `draw` with page `index` active, then restore the page that was active. */
    onPage(index, draw) {
      const previous = current;
      current = index;
      try {
        draw();
      } finally {
        current = previous;
      }
    },

    /** Run `draw` on every page - page numbering, footers, watermarks. */
    onEveryPage(draw) {
      const previous = current;
      try {
        pages.forEach((_, index) => {
          current = index;
          draw(index + 1, pages.length);
        });
      } finally {
        current = previous;
      }
    },

    /** Raw base64, with no `data:` prefix - what the send-receipt endpoint expects. */
    toBase64() {
      return pdfDoc.saveAsBase64();
    },

    toBytes() {
      return pdfDoc.save();
    },

    /**
     * Hand the finished document to the browser as a download.
     *
     * A blob, never a data: URI: Chrome refuses to navigate to a data: URI at the top level,
     * so a download built from one silently does nothing on some browsers. The object URL is
     * revoked on the next tick, once the click has been dispatched.
     */
    async save(fileName) {
      const blob = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  };

  /**
   * Trim to `width` mm with a trailing ellipsis, leaving text that already fits untouched.
   * Walks grapheme clusters so a Bengali name is never cut between a consonant and its matra.
   *
   * A function declaration, so it is hoisted above the surface methods that call it while
   * still being defined after `surface` itself exists.
   */
  function fit(text, width, { size = 9, weight = 'normal' } = {}) {
    const value = String(text ?? '');
    if (surface.measure(value, { size, weight }) <= width) return value;
    let out = '';
    for (const cluster of graphemes(value)) {
      if (surface.measure(`${out}${cluster}...`, { size, weight }) > width) break;
      out += cluster;
    }
    return out ? `${out}...` : value;
  }

  return surface;
}

/**
 * Split into user-perceived characters.
 *
 * Intl.Segmenter keeps a Bengali consonant together with its matra, hasant and any conjunct
 * that follows; iterating a string directly yields code points, which would let a hard break
 * land in the middle of one. Falls back to code points where Segmenter is unavailable -
 * still better than UTF-16 units, and the fallback only affects where a very long unbroken
 * word wraps, never whether it renders.
 */
function graphemes(str) {
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('bn', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(str), (s) => s.segment);
    }
  } catch {
    // Segmenter unsupported for this locale - fall through.
  }
  return Array.from(str);
}
