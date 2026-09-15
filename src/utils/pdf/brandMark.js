import logoSvg from '../../assets/icons/logo.svg?raw';

/**
 * The app logo, drawn into a PDF as vector artwork.
 *
 * It used to be rasterised: an <img> was drawn into an oversized canvas and the PNG embedded.
 * That was a workaround for jsPDF, which cannot draw paths from an SVG, and it carried two
 * permanent costs - the mark was only ever as sharp as the chosen supersampling factor, and
 * the whole receipt could not be generated anywhere without a DOM.
 *
 * pdf-lib draws SVG paths directly, so the mark is now genuine vector: sharp at any zoom or
 * print resolution, a few hundred bytes instead of a bitmap, and no canvas involved.
 *
 * The geometry is read from the real logo.svg via Vite's `?raw`, not copied into this file,
 * so a redrawn logo reaches the PDF without anyone remembering to update a second copy.
 */

/** Kappa: the cubic-Bezier constant that approximates a quarter circle. */
const KAPPA = 0.5522847498;

/** viewBox of logo.svg, used to scale the artwork to a requested height. */
const VIEW_BOX = parseViewBox(logoSvg);

/** Every drawable shape in the file, already flattened to path data. */
const SHAPES = parseShapes(logoSvg);

function parseViewBox(svg) {
  const match = /viewBox="([\d.\s-]+)"/.exec(svg);
  if (!match) return { width: 42, height: 50 };
  const [, , width, height] = match[1].trim().split(/\s+/).map(Number);
  return { width, height };
}

/**
 * Collect <path> and <rect> elements as {d, fill} pairs.
 *
 * Rects are converted to path data here rather than given their own draw call, so the
 * renderer only ever deals with one kind of shape. `fill="none"` is skipped - in this file
 * it is the <svg> element's own attribute, which would otherwise paint a black box.
 */
function parseShapes(svg) {
  const shapes = [];

  for (const tag of svg.match(/<path\b[^>]*>/g) ?? []) {
    const d = /\sd="([^"]+)"/.exec(tag)?.[1];
    const fill = /fill="([^"]+)"/.exec(tag)?.[1];
    if (d && fill && fill !== 'none') shapes.push({ d, fill });
  }

  for (const tag of svg.match(/<rect\b[^>]*>/g) ?? []) {
    const num = (name) => Number(new RegExp(`\\s${name}="([\\d.-]+)"`).exec(tag)?.[1] ?? 0);
    const fill = /fill="([^"]+)"/.exec(tag)?.[1];
    if (!fill || fill === 'none') continue;
    shapes.push({ d: rectPath(num('x'), num('y'), num('width'), num('height'), num('rx')), fill });
  }

  return shapes;
}

function rectPath(x, y, width, height, rx) {
  const r = Math.max(0, Math.min(rx, width / 2, height / 2));
  if (r === 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }
  const c = r * KAPPA;
  const right = x + width;
  const bottom = y + height;
  return [
    `M ${x + r} ${y}`,
    `H ${right - r}`,
    `C ${right - r + c} ${y} ${right} ${y + r - c} ${right} ${y + r}`,
    `V ${bottom - r}`,
    `C ${right} ${bottom - r + c} ${right - r + c} ${bottom} ${right - r} ${bottom}`,
    `H ${x + r}`,
    `C ${x + r - c} ${bottom} ${x} ${bottom - r + c} ${x} ${bottom - r}`,
    `V ${y + r}`,
    `C ${x} ${y + r - c} ${x + r - c} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

/**
 * Draw the logo with its top-left corner at (x, y), scaled to `heightMm`.
 *
 * Width follows the artwork's own aspect ratio and is returned, so a caller can lay out
 * what sits beside it. The previous rasterised version was drawn into a hardcoded 12x12mm
 * box against a 42x50 source, which stretched the mark horizontally by about 19%.
 *
 * @returns {{width: number, height: number}} the drawn size in mm
 */
export function drawBrandMark(surface, x, y, heightMm) {
  const unitsPerMm = VIEW_BOX.height / heightMm;
  for (const shape of SHAPES) {
    surface.svgPath(shape.d, x, y, { fill: shape.fill, unitsPerMm });
  }
  return {
    width: (VIEW_BOX.width / VIEW_BOX.height) * heightMm,
    height: heightMm,
  };
}
