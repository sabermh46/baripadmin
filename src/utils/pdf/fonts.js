/**
 * Font resolution for generated PDFs, including Bengali.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The receipt used to be drawn with jsPDF, whose built-in fonts are Latin-1 only. An owner
 * named in Bengali came out on the tenant's receipt as a row of mojibake
 * ("Owner: (R)E(1/4)(R)I(R)| ...") rather than their name.
 *
 * Embedding a Bengali TTF into jsPDF does not fix that either. jsPDF writes glyphs in
 * logical order with no shaping engine, and Bengali needs shaping: conjuncts have to fuse
 * (ka + hasant + ssa is ONE glyph) and pre-base vowel signs are typed after their consonant
 * but drawn before it (ka + i-matra is stored k,i and must be drawn i,k). Without a shaper
 * the text is still wrong, just wrong differently.
 *
 * pdf-lib routes text through fontkit, which does implement the OpenType Indic shaper, so
 * the glyph run written into the PDF is the correctly shaped one and the text stays real
 * text: selectable, searchable, and a few KB rather than a bitmap.
 *
 * TWO SHARP EDGES, both handled below:
 *
 *   1. `@pdf-lib/fontkit` - the companion package pdf-lib's own docs point at - is an old
 *      fork bundled by Babel without its regenerator runtime. The moment it reaches the
 *      Indic shaper it dies with `ReferenceError: regeneratorRuntime is not defined`. It is
 *      fine for Latin and unusable for Bengali, so we register the current `fontkit`
 *      package instead.
 *   2. Current fontkit renamed the subset encoder: it exposes `encode(): Uint8Array` where
 *      pdf-lib still calls the old Node-stream `encodeStream()`. `adaptFontkit` bridges the
 *      two, which is the whole reason pdf-lib can subset a modern fontkit font at all.
 */

/**
 * The Bengali block, plus the danda and double danda.
 *
 * The dandas (U+0964/U+0965) are the full stop of Bengali prose but live in the Devanagari
 * block, outside U+0980-U+09FF. Leaving them out classified them as Latin, so a sentence
 * ending was handed to Helvetica - which cannot encode it - and every one of them came back
 * as a question mark in the middle of the tenant's note.
 */
const COMPLEX_SCRIPT = /[\u0980-\u09ff\u0964\u0965]/;

/**
 * Does this text need the embedded Bengali face rather than a built-in Latin one?
 * Exported because callers use it to decide whether to pay for the font download at all.
 */
export function hasComplexScript(text) {
  return typeof text === 'string' && COMPLEX_SCRIPT.test(text);
}

/**
 * Characters that belong to whichever run they find themselves in: spaces, ASCII digits and
 * punctuation. Without this every space in a Bengali sentence would start a new run.
 */
const SCRIPT_NEUTRAL = /[\s\d!-/:-@[-`{-~\u00a0-\u00bf\u2010-\u203a\u200c\u200d]/;

/**
 * Split a string into runs of one script each.
 *
 * THIS IS LOAD-BEARING, and the bug it fixes is invisible until you read the Bengali.
 *
 * fontkit chooses its shaper from the FIRST strong character in the string. So
 * "Owner: <bengali name>" is shaped as Latin: the Indic shaper never runs, and the mark
 * positioning that pulls a u-matra back under its consonant never happens. The name renders
 * with its vowel signs hanging off the wrong letters - "mahmud" comes out as "mahmdu" - while
 * the very same name on a line of its own renders perfectly. That is why this cannot be left
 * to a per-string font choice: the split has to happen inside the line.
 *
 * Neutral characters join the run in progress, so "Flat: 101" in Bengali numerals stays two
 * runs rather than five.
 *
 * @returns {Array<{text: string, complex: boolean}>}
 */
export function splitScriptRuns(text) {
  const value = String(text ?? '');
  const runs = [];
  let current = null;

  for (const char of value) {
    const complex = COMPLEX_SCRIPT.test(char);
    const neutral = !complex && SCRIPT_NEUTRAL.test(char);

    if (current && (neutral || current.complex === complex)) {
      current.text += char;
      continue;
    }
    current = { text: char, complex };
    runs.push(current);
  }

  return runs;
}

/** True if any value anywhere in `values` needs Bengali - arrays and objects included. */
export function needsComplexScript(values) {
  const seen = new Set();
  const walk = (value) => {
    if (value == null) return false;
    if (typeof value === 'string') return hasComplexScript(value);
    if (typeof value !== 'object') return false;
    if (seen.has(value)) return false; // guards against a cyclic payload
    seen.add(value);
    return Object.values(value).some(walk);
  };
  return walk(values);
}

const FONT_FILES = {
  normal: 'fonts/AnekBangla-Regular.ttf',
  bold: 'fonts/AnekBangla-Bold.ttf',
};

let fontBytesPromise = null;

/**
 * Fetch the Bengali faces once per session.
 *
 * Anek Bangla (OFL), self-hosted in public/fonts and the same face the app UI renders
 * Bengali in, so the receipt looks like the screen it was generated from. It replaced Hind
 * Siliguri, whose Regular weight ships a defective Bengali digit one (U+09E7) - that glyph
 * lands in any note, address or flat number written with Bengali numerals.
 *
 * These are the bengali+latin subsets Google Fonts ships, so one face covers a mixed line
 * such as "Owner: <bengali name>" without splitting it across two faces and breaking its
 * metrics.
 *
 * On failure the promise is cleared so a later receipt can retry rather than inheriting a
 * permanently rejected promise from one bad network moment.
 */
export function loadBengaliFontBytes() {
  if (fontBytesPromise) return fontBytesPromise;

  const base = import.meta.env?.BASE_URL || '/';
  fontBytesPromise = Promise.all(
    Object.entries(FONT_FILES).map(async ([weight, file]) => {
      const response = await fetch(`${base}${file}`);
      if (!response.ok) throw new Error(`Bengali font ${weight}: HTTP ${response.status}`);
      return [weight, new Uint8Array(await response.arrayBuffer())];
    }),
  )
    .then(Object.fromEntries)
    .catch((err) => {
      fontBytesPromise = null;
      throw err;
    });

  return fontBytesPromise;
}

/**
 * Wrap fontkit so pdf-lib's subset embedder can drive it.
 *
 * pdf-lib calls `subset.encodeStream()` and attaches Node-style `data`/`end`/`error`
 * handlers. Modern fontkit returns the bytes synchronously from `encode()` instead, so we
 * hand back a minimal chainable emitter. The emit is deferred to a microtask because
 * pdf-lib attaches all three handlers in one synchronous chain - firing `data` immediately
 * would run before `.on('end')` had been registered.
 */
function adaptFontkit(fontkit) {
  return {
    create(bytes, postscriptName) {
      const font = fontkit.create(bytes, postscriptName);
      const createSubset = font.createSubset?.bind(font);
      if (!createSubset) return font;

      font.createSubset = () => {
        const subset = createSubset();
        if (typeof subset.encodeStream === 'function') return subset;

        subset.encodeStream = () => {
          const handlers = {};
          const stream = {
            on(event, callback) {
              handlers[event] = callback;
              return stream;
            },
          };
          queueMicrotask(() => {
            try {
              handlers.data?.(subset.encode());
              handlers.end?.();
            } catch (err) {
              handlers.error?.(err);
            }
          });
          return stream;
        };
        return subset;
      };
      return font;
    },
  };
}

/**
 * Register fontkit on a PDFDocument and embed the Bengali faces into it.
 *
 * Imported dynamically: a receipt with no Bengali on it never downloads fontkit or the
 * typefaces, which is the common case and keeps that path exactly as cheap as it was.
 *
 * @returns {Promise<{normal: {pdf: import('pdf-lib').PDFFont, face: object},
 *                     bold: {pdf: import('pdf-lib').PDFFont, face: object}}>}
 */
export async function embedBengaliFonts(pdfDoc) {
  const [fontkitModule, bytes] = await Promise.all([
    import('fontkit'),
    loadBengaliFontBytes(),
  ]);
  const fontkit = fontkitModule.default ?? fontkitModule;

  pdfDoc.registerFontkit(adaptFontkit(fontkit));

  const [normal, bold] = await Promise.all([
    pdfDoc.embedFont(bytes.normal, { subset: true }),
    pdfDoc.embedFont(bytes.bold, { subset: true }),
  ]);

  // A second, plain fontkit handle on the same bytes, because pdf-lib gives no way to read
  // the positions its own layout produced - and those positions are the whole difference
  // between a correct Bengali word and a wrong one. See drawPositionedText in surface.js.
  return {
    normal: { pdf: normal, face: fontkit.create(bytes.normal) },
    bold: { pdf: bold, face: fontkit.create(bytes.bold) },
  };
}

/**
 * Punctuation above U+00FF that WinAnsi can still encode: en/em dash, curly quotes,
 * bullet, ellipsis. Listed by code point rather than as literals so the set is reviewable.
 */
const EXTRA_ENCODABLE = new Set([0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026]);

/**
 * Replace anything the built-in Latin faces cannot encode.
 *
 * Only reached when Bengali text exists but its font could not be loaded (offline, or the
 * file is missing from the deploy). pdf-lib THROWS on an unencodable character rather than
 * dropping it, so without this one Bengali character anywhere would abort the whole
 * receipt. A row of "?" is a poor receipt; no receipt at all is a worse one.
 */
export function toLatin1Safe(text) {
  let out = '';
  for (const char of String(text ?? '')) {
    const code = char.codePointAt(0);
    out += (code <= 0xff || EXTRA_ENCODABLE.has(code)) ? char : '?';
  }
  return out;
}

