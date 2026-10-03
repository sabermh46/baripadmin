import { monthRelativity } from './rentMonth';

/**
 * Where a flat sits in its building, read from its flat number.
 *
 * Owners number flats floor first: 101 is floor 1, flat 01; 1203 is floor 12, flat 03. The
 * last two digits are the place on the floor and everything before them is the floor. Two
 * other forms common here are read too: "3B" / "3-B" (floor 3, second flat) and "G1" / "G-01"
 * (ground floor).
 *
 * Read from the number rather than the flats.floor column: until the flat form asked for the
 * floor, nothing set that column, so it is 0 for most existing flats.
 *
 * Anything else ("A1", "12", no number at all) is not guessed at: the flat is listed beside
 * the building instead, with what to change.
 */
export const MAX_FLOOR = 60;
export const MAX_POSITION = 50; // same limits as App\Support\FlatNumber on the server

// `label` is the place as the owner wrote it ("01", "B"), for showing back to them.
const place = (floor, position, label) =>
  Number.isInteger(floor) && Number.isInteger(position) &&
  floor >= 0 && floor <= MAX_FLOOR && position >= 1 && position <= MAX_POSITION
    ? { floor, position, label }
    : null;

const letterIndex = (ch) => ch.charCodeAt(0) - 64; // A → 1

/** @returns {{floor: number, position: number, label: string} | null} */
export const parseFlatPosition = (number) => {
  const s = String(number ?? '').trim().toUpperCase();
  if (!s) return null;

  if (/^\d{3,}$/.test(s)) return place(Number(s.slice(0, -2)), Number(s.slice(-2)), s.slice(-2));

  let m = s.match(/^G[\s-]?(\d{1,2})$/);
  if (m) return place(0, Number(m[1]), m[1].padStart(2, '0'));
  m = s.match(/^G[\s-]?([A-Z])$/);
  if (m) return place(0, letterIndex(m[1]), m[1]);

  m = s.match(/^(\d{1,2})[\s-]?([A-Z])$/);
  if (m) return place(Number(m[1]), letterIndex(m[2]), m[2]);

  return null;
};

/**
 * The number a floor and a place on it make, written the way the server writes it:
 * floor 1, flat 1 → "101"; floor 12, flat 3 → "1203"; ground floor → "G01".
 */
export const composeFlatNumber = (floor, position) => {
  const p = String(position).padStart(2, '0');
  return Number(floor) === 0 ? `G${p}` : `${floor}${p}`;
};

/**
 * The building a list of flats makes: one row per floor, top floor first, one cell per
 * place on the floor (null where no flat has that number). Floors and places with no flat
 * are kept as blank wall, so 201 still sits above 101 when 102 does not exist.
 *
 * @returns {{
 *   floors: number, columns: number, hasGround: boolean,
 *   rows: {floor: number, cells: ({position: number, flat: object|null, label: string|null})[]}[],
 *   unplaced: {flat: object, reason: 'no_number'|'unreadable'|'duplicate'}[],
 *   placed: number,
 * }}
 */
export const buildingLayout = (flats = []) => {
  const byPlace = new Map();
  const unplaced = [];

  // By id, so which of two flats sharing a number gets the window is stable.
  [...flats]
    .sort((a, b) => a.id - b.id)
    .forEach((flat) => {
      if (!String(flat.number ?? '').trim()) {
        unplaced.push({ flat, reason: 'no_number' });
        return;
      }
      const pos = parseFlatPosition(flat.number);
      if (!pos) {
        unplaced.push({ flat, reason: 'unreadable' });
        return;
      }
      const key = `${pos.floor}:${pos.position}`;
      if (byPlace.has(key)) {
        unplaced.push({ flat, reason: 'duplicate' });
        return;
      }
      byPlace.set(key, { ...pos, flat });
    });

  const placed = [...byPlace.values()];
  if (!placed.length) return { floors: 0, columns: 0, hasGround: false, rows: [], unplaced, placed: 0 };

  const floors = Math.max(1, ...placed.map((p) => p.floor));
  const columns = Math.max(2, ...placed.map((p) => p.position));
  const hasGround = placed.some((p) => p.floor === 0);

  const rows = [];
  for (let floor = floors; floor >= (hasGround ? 0 : 1); floor--) {
    rows.push({
      floor,
      cells: Array.from({ length: columns }, (_, i) => ({
        position: i + 1,
        flat: byPlace.get(`${floor}:${i + 1}`)?.flat ?? null,
        label: byPlace.get(`${floor}:${i + 1}`)?.label ?? null,
      })),
    });
  }

  return { floors, columns, hasGround, rows, unplaced, placed: placed.length };
};

/**
 * What a window shows. Occupancy first (lit or dark), then money: a past month still unpaid
 * is overdue, an unpaid current or coming month is only due. Same rule as the flat cards.
 *
 * @returns {'vacant'|'occupied'|'due'|'overdue'}
 */
export const windowState = (flat) => {
  if (!flat?.isOccupied) return 'vacant';
  const rent = flat.rentState ?? {};
  if (!(rent.dueAmount > 0)) return 'occupied';
  return rent.status === 'overdue' || monthRelativity(rent.forMonth) === 'past' ? 'overdue' : 'due';
};
