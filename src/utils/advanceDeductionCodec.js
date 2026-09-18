/**
 * The storage form of a deduction history entry - browser half.
 *
 * The API returns deduction history in its compact storage form and this expands it, so every
 * component downstream keeps reading `deducted_amount` and `emailed` rather than `da` and `em`.
 * Decoding happens once, in the RTK Query `transformResponse`, which is why no component had
 * to change when the storage form did.
 *
 * THIS FILE HAS A TWIN: barip-php/app/Services/AdvanceDeductionCodec.php. The two key maps are
 * asserted equal by AdvanceDeductionCodecTest, which parses THIS file - so an edit to one
 * without the other fails the backend test suite rather than silently mangling stored rows.
 *
 * Why the form is compact at all: written in full an entry cost ~515 bytes, and 92 of those
 * were a copy of the staff member's name on every single row - a person who is already a
 * stable row in `users`. See the PHP twin for the full reasoning.
 */

/** Stored key => full key. Never reuse a short key for a different field. */
export const KEYS = {
  i: 'id',
  rp: 'rent_payment_id',
  rnt: 'renter_id',
  rn: 'renter_name',
  fm: 'for_month',
  da: 'deducted_amount',
  ra: 'remaining_after',
  dt: 'date',
  src: 'source',
  st: 'status',
  em: 'emailed',
  sm: 'smsed',
  er: 'email_row',
  ep: 'email_pdf',
  cb: 'created_by',
  ct: 'created_at',
  ut: 'updated_at',
  ed: 'edits',
  rva: 'reverted_at',
  rvb: 'reverted_by',
};

/** Short keys for one amendment inside `edits`. `by_name` is dropped, as on the entry. */
export const EDIT_KEYS = {
  f: 'from',
  t: 'to',
  a: 'at',
  b: 'by',
};

/** Values so common they are written by being absent. */
const DEFAULTS = {
  status: 'applied',
  emailed: 0,
  smsed: 0,
  email_row: null,
  email_pdf: null,
};

const TIME_KEYS = ['created_at', 'updated_at', 'reverted_at'];

/** Unix seconds back to the ISO-8601 string the components format. */
const toIso = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    return new Date(Number(value) * 1000).toISOString();
  }
  return String(value);
};

const decodeEdit = (edit) => {
  if (!edit || typeof edit !== 'object') return {};

  // Already long-form, from a row written before the codec existed.
  if ('from' in edit || 'to' in edit) {
    const { by_name: _dropped, ...rest } = edit;
    return rest;
  }

  const full = {};
  for (const [short, key] of Object.entries(EDIT_KEYS)) {
    if (short in edit) full[key] = key === 'at' ? toIso(edit[short]) : edit[short];
  }
  return full;
};

/**
 * Storage form to the full entry.
 *
 * @param {object} stored
 * @param {number} [advanceId]  the advance it is stored on; restored onto the entry, since it
 *                              is not written (it cannot be anything else)
 * @param {object} [actors]     id => name, for the `created_by` / `reverted_by` users
 */
export function decodeDeduction(stored, advanceId = null, actors = {}) {
  if (!stored || typeof stored !== 'object') return null;

  const isLegacy = 'id' in stored || 'deducted_amount' in stored;

  let entry;
  if (isLegacy) {
    entry = { ...stored };
  } else {
    entry = {};
    for (const [short, key] of Object.entries(KEYS)) {
      if (!(short in stored)) continue;
      if (TIME_KEYS.includes(key)) entry[key] = toIso(stored[short]);
      else if (key === 'edits') entry[key] = stored[short] ?? [];
      else entry[key] = stored[short];
    }
  }

  entry.advance_payment_id = advanceId ?? entry.advance_payment_id ?? null;

  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    if (!(key in entry)) entry[key] = fallback;
  }

  entry.updated_at = entry.updated_at ?? entry.created_at ?? null;
  entry.edits = (entry.edits ?? []).map(decodeEdit);

  // Resolved from the users map rather than stored per row. Null when the account is gone -
  // the deduction still happened, and the row must not disappear with the person.
  entry.created_by_name = actors?.[entry.created_by] ?? null;
  if (entry.reverted_by) entry.reverted_by_name = actors?.[entry.reverted_by] ?? null;
  entry.edits = entry.edits.map((edit) => (
    edit.by ? { ...edit, by_name: actors?.[edit.by] ?? null } : edit
  ));

  return entry;
}

/**
 * Expand every entry on one advance payment.
 *
 * Tolerates an advance that carries no history at all, which is every advance whose deductions
 * predate the ledger - there was no backfill, by choice.
 */
export function decodeAdvance(advance) {
  if (!advance || typeof advance !== 'object') return advance;

  const actors = advance.actors ?? {};
  const deductions = Array.isArray(advance.deductions) ? advance.deductions : [];

  return {
    ...advance,
    deductions: deductions
      .map((entry) => decodeDeduction(entry, advance.id, actors))
      .filter(Boolean),
  };
}

/** Expand a list of advance payments. */
export function decodeAdvances(advances) {
  return Array.isArray(advances) ? advances.map(decodeAdvance) : advances;
}

/**
 * Full entry to its storage form.
 *
 * The browser never writes history - the server owns that - so this exists to prove the two
 * halves agree. The codec test round-trips through it.
 */
export function encodeDeduction(entry) {
  const compact = {};

  for (const [short, key] of Object.entries(KEYS)) {
    if (!(key in entry)) continue;
    const value = entry[key];

    if (key in DEFAULTS && value === DEFAULTS[key]) continue;
    if (value === null && !(key in DEFAULTS)) continue;

    if (TIME_KEYS.includes(key)) {
      compact[short] = value === null ? null : Math.floor(new Date(value).getTime() / 1000);
    } else if (key === 'edits') {
      compact[short] = (value ?? []).map((edit) => {
        const out = {};
        for (const [editShort, editKey] of Object.entries(EDIT_KEYS)) {
          if (editKey in edit && edit[editKey] !== null) {
            out[editShort] = editKey === 'at'
              ? Math.floor(new Date(edit[editKey]).getTime() / 1000)
              : edit[editKey];
          }
        }
        return out;
      });
    } else {
      compact[short] = value;
    }
  }

  if (compact.ut !== undefined && compact.ut === compact.ct) delete compact.ut;

  return compact;
}
