/**
 * The app's PDF toolkit.
 *
 * Build a document by creating a surface and stacking blocks onto it:
 *
 *   const surface = await createSurface({ content: data });   // scans `data` for Bengali
 *   documentHeader(surface, { documentType: 'RENT RECEIPT' });
 *   dataTable(surface, { x, y, width, head, rows });
 *   pageFooter(surface, { parts: ['Computer-generated'] });
 *   return surface.toBase64();
 *
 * Everything is in millimetres with the origin at the top-left, and Bengali is handled by
 * the surface rather than by each document - see ./fonts.js for why that is not automatic.
 */

export { createSurface, mmToPt, ptToMm } from './surface';
export { hasComplexScript, needsComplexScript } from './fonts';
export { drawBrandMark } from './brandMark';
export { COLORS, PAGE, RADIUS, TYPE, LINE_STEP } from './theme';
export {
  documentHeader,
  detailPanel,
  panelHeightFor,
  dataTable,
  highlightCard,
  noteBlock,
  factRow,
  sectionHeading,
  footnote,
  pageFooter,
} from './blocks';
