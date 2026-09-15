# pdf.js standard font data

These are not used by the PDFs this app *generates*. They are used when the app has to
*render* a PDF itself, in `src/components/common/PdfPreview.jsx`.

A generated receipt draws its Latin text with Helvetica, one of the 14 base fonts every PDF
viewer is required to provide, so the file never embeds it. pdf.js has no such built-in — it
substitutes Liberation Sans and fetches the outlines from `standardFontDataUrl` at render
time. Without these files the preview renders the panels, rules and Bengali correctly and
silently drops every Latin character, which looks like a broken receipt rather than a missing
asset.

Only the two faces the PDF toolkit can actually produce are copied here (`surface.js` embeds
Helvetica and Helvetica-Bold, nothing else). If a document ever draws with an italic, serif or
monospace standard font, copy the matching file across from
`node_modules/pdfjs-dist/standard_fonts/` as well.

Source: `pdfjs-dist@5.6.205`. Licence: `LICENSE_LIBERATION` (SIL OFL 1.1).
Re-copy these after a pdfjs-dist major upgrade.
