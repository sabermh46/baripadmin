import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, LayoutDashboard, Mail, Paperclip, Receipt, RefreshCw, Users, Wallet } from 'lucide-react';
import TkSymbol from '../../components/common/TkSymbol';
import { money } from '../../utils/paymentDisplay';
import { landingLocale } from '../../store/api/landingApi';

/**
 * Feature showcase: the client's six marketing flyers, rebuilt as one tabbed section.
 *
 * The copy (tab label, headline, points) comes from the landing CMS `showcase` section so it
 * can be reworded from the Landing Page Editor. The mockup on the right of each tab is picked
 * by the tab's `mockup` key and drawn here, from our own tokens and Anek Bangla — that is the
 * point of rebuilding the flyers rather than embedding them as images.
 *
 * Figures use Latin digits with 123,000-style grouping (`money`), as the app itself does, not
 * the flyers' Bengali numerals: a visitor who signs up should see the same figures they saw here.
 */

// The words inside the mockups, in each language the landing page has. The figures are shared;
// only names and labels change. The section's own copy (tabs, headlines, points) is not here: it
// comes from the landing CMS in the visitor's language.
const COPY = {
  bn: {
    month: 'নভেম্বর 2026',
    renters: ['রহিম উদ্দিন', 'সুমি আক্তার', 'জাহিদ হাসান', 'নাসরিন বেগম', 'করিম মিয়া'],
    expenses: ['কেয়ারটেকারের বেতন', 'বিদ্যুৎ বিল', 'পানির বিল', 'মেরামত', 'অন্যান্য'],
    paid: 'পরিশোধিত', due: 'বকেয়া', flat: 'ফ্ল্যাট', totalRent: 'মোট ভাড়া', collectedSoFar: 'আদায় হয়েছে',
    thisMonthsRent: 'এই মাসের ভাড়া', collectionRate: 'আদায়ের হার', brand: 'বাড়ি পরিচালনা',
    receiptSubject: (month) => `প্রতি: ভাড়াটিয়া · বিষয়: ${month} – ভাড়ার রশিদ`,
    dear: (name) => `প্রিয় ${name},`, receiptIntro: 'নভেম্বর মাসের ভাড়ার হিসাব নিচে দেওয়া হলো।',
    receiptNo: 'রশিদ নং', monthLabel: 'মাস', monthlyRent: 'মাসিক ভাড়া', paidOn: 'পরিশোধের তারিখ',
    paidOnValue: '05 নভেম্বর 2026', status: 'অবস্থা', receiptFile: 'ভাড়ার_রশিদ_নভেম্বর_2026.pdf',
    collected: 'আদায়', mobile: 'মোবাইল', startDate: 'শুরুর তারিখ', startDateValue: '01 জানুয়ারি 2025',
    email: 'ইমেইল', reminder: 'রিমাইন্ডার', whenDue: 'ভাড়া বকেয়া থাকলে',
    reminderBody: (amount) => <>প্রিয় রহিম ভাই, নভেম্বর মাসের ভাড়া {amount} এখনো বকেয়া আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন।</>,
    totalSpent: 'মোট খরচ', spent: 'খরচ', remaining: 'অবশিষ্ট', dashboard: 'ড্যাশবোর্ড',
    monthlyCollection: 'মাসিক আদায় (%)', inBengali: 'বাংলা ভাষায়', sameAccounts: 'একই হিসাব, মোবাইল ও কম্পিউটারে',
  },
  en: {
    month: 'November 2026',
    renters: ['Rahim Uddin', 'Sumi Akter', 'Zahid Hasan', 'Nasrin Begum', 'Karim Mia'],
    expenses: ["Caretaker's salary", 'Electricity bill', 'Water bill', 'Repairs', 'Other'],
    paid: 'Paid', due: 'Due', flat: 'Flat', totalRent: 'Total rent', collectedSoFar: 'Collected',
    thisMonthsRent: "This month's rent", collectionRate: 'Collection rate', brand: 'Bari Porichalona',
    receiptSubject: (month) => `To: tenant · Subject: ${month} rent receipt`,
    dear: (name) => `Dear ${name},`, receiptIntro: 'Here is your rent statement for November.',
    receiptNo: 'Receipt no.', monthLabel: 'Month', monthlyRent: 'Monthly rent', paidOn: 'Paid on',
    paidOnValue: '05 November 2026', status: 'Status', receiptFile: 'rent_receipt_november_2026.pdf',
    collected: 'Collected', mobile: 'Mobile', startDate: 'Start date', startDateValue: '01 January 2025',
    email: 'Email', reminder: 'Reminder', whenDue: 'When rent is due',
    reminderBody: (amount) => <>Dear Rahim, your November rent of {amount} is still due. Please pay it soon.</>,
    totalSpent: 'Total spent', spent: 'Spent', remaining: 'Remaining', dashboard: 'Dashboard',
    monthlyCollection: 'Monthly collection (%)', inBengali: 'In Bengali', sameAccounts: 'The same accounts on mobile and computer',
  },
};

const MockCopy = createContext(COPY.bn);
const useMock = () => useContext(MockCopy);

const RENTERS = [
  { flat: '1A', rent: 12000, paid: true },
  { flat: '2B', rent: 10500, paid: true },
  { flat: '3A', rent: 11000, paid: false },
  { flat: '3B', rent: 9500, paid: true },
  { flat: '4A', rent: 13000, paid: false },
];

// Adjacent-pair separation checked with the dataviz validator (CVD ΔE ≥ 16). Teal and the gray
// "other" read low-chroma on their own, which is why every slice is also labeled with its amount.
const EXPENSES = [
  { amount: 8000, color: 'var(--color-secondary-700)' },
  { amount: 3500, color: 'var(--color-primary-500)' },
  { amount: 2000, color: 'var(--color-secondary-400)' },
  { amount: 4500, color: 'var(--color-primary-700)' },
  { amount: 1500, color: '#94a3b8' },
];

// The rows with this language's names on them.
const useRenters = () => {
  const m = useMock();
  return RENTERS.map((r, i) => ({ ...r, name: m.renters[i] }));
};
const useExpenses = () => {
  const m = useMock();
  return EXPENSES.map((e, i) => ({ ...e, label: m.expenses[i] }));
};

const Amount = ({ value, className = '' }) => (
  <span className={`whitespace-nowrap ${className}`}><TkSymbol />{money(value)}</span>
);

const StatusPill = ({ paid }) => {
  const m = useMock();
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
      paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    }`}>
      {paid ? m.paid : m.due}
    </span>
  );
};

const Initial = ({ name, className = '', tone = 'bg-secondary-100 text-secondary-700' }) => (
  <span className={`shrink-0 rounded-full font-bold flex items-center justify-center ${tone} ${className}`}>
    {name.charAt(0)}
  </span>
);

const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-2xl shadow-xl ${className}`}>{children}</div>
);

// ── Mockups ────────────────────────────────────────────────────────────────────
//
// Each mockup fills the height FitBox gives it (root `flex-1`), and rows marked `room-*` only
// appear once the panel is that tall, so a tall phone gets a fuller picture instead of a small
// card floating in teal. Anything that still does not fit is scaled down by FitBox.

// Shown from the given panel height up. Spelled out in full so Tailwind can see each class.
const ROOM = {
  340: 'hidden room-340:flex',
  380: 'hidden room-380:flex',
  420: 'hidden room-420:flex',
  460: 'hidden room-460:flex',
};

const Bar = ({ value, className = 'bg-green-600' }) => (
  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
    <div className={`h-full rounded-full ${className}`} style={{ width: `${value}%` }} />
  </div>
);

// A row of three totals. On a 300px phone each tile is under 80px wide, so the type is sized off
// the row's own width (cqi) — fixed sizes that suit 360px pushed "৳ 125,000" out of the tile.
const TotalTiles = ({ items }) => (
  <div className="@container">
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {items.map(({ label, value, tone, dot }) => (
        <Card key={label} className="min-w-0 p-[clamp(8px,3.5cqi,16px)]">
          <div className="flex items-center gap-1.5 mb-1">
            {dot && <span className={`w-2 h-2 shrink-0 rounded-full ${dot}`} />}
            <span className="text-[clamp(9px,3.9cqi,12px)] text-subdued truncate">{label}</span>
          </div>
          <Amount value={value} className={`block text-[clamp(10px,5.2cqi,18px)] font-bold ${tone}`} />
        </Card>
      ))}
    </div>
  </div>
);

const OverviewMockup = () => {
  const m = useMock();
  const renters = useRenters();
  return (
  <div className="flex-1 flex flex-col gap-3">
    <TotalTiles items={[
      { label: m.totalRent, value: 125000, tone: 'text-secondary-700', dot: 'bg-secondary-700' },
      { label: m.collectedSoFar, value: 95000, tone: 'text-green-700', dot: 'bg-green-600' },
      { label: m.due, value: 30000, tone: 'text-red-600', dot: 'bg-red-500' },
    ]} />
    <Card className="flex-1 p-4 flex flex-col">
      <h4 className="text-sm font-bold text-secondary-700 mb-3">{m.thisMonthsRent}</h4>
      <div className="flex-1 flex flex-col justify-around gap-3">
        {renters.map((r, i) => (
          <div key={r.name} className={`${i === 3 ? ROOM[340] : i === 4 ? ROOM[420] : 'flex'} items-center gap-3`}>
            <Initial name={r.name} className="w-9 h-9 text-sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{r.name}</div>
              <div className="text-[11px] text-subdued">{m.flat} {r.flat}</div>
            </div>
            {/* Stacked on a phone: side by side they leave the name about four letters. */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3">
              <Amount value={r.rent} className="text-sm font-semibold text-gray-800" />
              <StatusPill paid={r.paid} />
            </div>
          </div>
        ))}
      </div>
      <div className={`${ROOM[460]} flex-col gap-1.5 mt-3 pt-3 border-t border-gray-100`}>
        <div className="flex justify-between text-xs">
          <span className="text-subdued">{m.collectionRate}</span>
          <span className="font-semibold text-green-700">76%</span>
        </div>
        <Bar value={76} />
      </div>
    </Card>
  </div>
  );
};

const ReceiptMockup = () => {
  const m = useMock();
  const r = useRenters()[0];
  return (
    <Card className="flex-1 overflow-hidden flex flex-col">
      <div className="bg-secondary-100 px-4 py-3 flex items-center gap-3">
        <span className="w-9 h-9 shrink-0 rounded-full bg-secondary-700 text-white flex items-center justify-center">
          <Mail className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-secondary-700">{m.brand}</div>
          <div className="text-[11px] text-subdued truncate">{m.receiptSubject(m.month)}</div>
        </div>
      </div>
      <div className="flex-1 p-4 sm:p-5 flex flex-col">
        <p className="text-sm font-bold text-gray-900">{m.dear(r.name)}</p>
        <p className="text-xs text-subdued mb-3">{m.receiptIntro}</p>
        <dl className="flex-1 flex flex-col justify-around text-sm divide-y divide-gray-100 border-t border-gray-100">
          {[
            [m.receiptNo, 'BP-2611-01', ROOM[380]],
            [m.flat, r.flat],
            [m.monthLabel, m.month],
            [m.monthlyRent, <Amount key="rent" value={r.rent} />],
            [m.paidOn, m.paidOnValue, ROOM[340]],
          ].map(([label, value, show = 'flex']) => (
            <div key={label} className={`${show} justify-between gap-2 py-2.5`}>
              <dt className="text-subdued">{label}</dt>
              <dd className="font-semibold text-gray-900 whitespace-nowrap">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between items-center py-2.5">
            <dt className="text-subdued">{m.status}</dt>
            <dd><StatusPill paid /></dd>
          </div>
        </dl>
        <div className={`${ROOM[420]} items-center gap-2 mt-3 rounded-xl border border-dashed border-secondary-300 bg-secondary-100/50 px-3 py-2 text-xs text-secondary-700`}>
          <Paperclip className="w-4 h-4 shrink-0" aria-hidden />
          <span className="truncate font-semibold">{m.receiptFile}</span>
        </div>
      </div>
    </Card>
  );
};

const StatusMockup = () => {
  const m = useMock();
  const renters = useRenters();
  const paid = RENTERS.filter((r) => r.paid).length;
  const due = RENTERS.reduce((sum, r) => sum + r.rent, 0);
  const collected = RENTERS.reduce((sum, r) => sum + (r.paid ? r.rent : 0), 0);
  return (
    <Card className="flex-1 p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 rounded-xl bg-green-50 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-green-700">{m.paid}</span>
          <span className="text-lg font-bold text-green-700">{paid}</span>
        </div>
        <div className="flex-1 rounded-xl bg-red-50 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-red-600">{m.due}</span>
          <span className="text-lg font-bold text-red-600">{RENTERS.length - paid}</span>
        </div>
        <span className="hidden sm:block text-xs text-subdued pl-2">{m.month}</span>
      </div>
      <div className={`${ROOM[420]} flex-col gap-1.5 mb-3`}>
        <div className="flex justify-between text-xs">
          <span className="text-subdued">{m.month} · {m.collected}</span>
          <span className="font-semibold text-gray-800"><Amount value={collected} /> / <Amount value={due} /></span>
        </div>
        <Bar value={Math.round((collected / due) * 100)} />
      </div>
      <div className="flex-1 flex flex-col justify-around divide-y divide-gray-100 border-t border-gray-100">
        {renters.map((r) => (
          <div key={r.name} className="flex items-center gap-2 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{r.name}</div>
              {/* Under 20rem the rent joins this line: as its own column it left the name two letters. */}
              <div className="sm:hidden text-[11px] text-subdued whitespace-nowrap">
                {m.flat} {r.flat}<span className="hidden @max-xs:inline"> · <Amount value={r.rent} className="font-semibold text-gray-700" /></span>
              </div>
            </div>
            <span className="hidden sm:block w-20 text-xs text-subdued">{m.flat} {r.flat}</span>
            <Amount value={r.rent} className="w-20 @max-xs:hidden text-sm font-semibold text-gray-800" />
            <span className="w-20 text-right"><StatusPill paid={r.paid} /></span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const ReminderMockup = ({ label, badge }) => {
  const m = useMock();
  const r = useRenters()[0];
  return (
    <div className="flex-1 grid sm:grid-cols-2 content-center gap-3">
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Initial name={r.name} className="w-11 h-11 text-lg" tone="bg-secondary-700 text-white" />
          <div>
            <div className="text-sm font-bold text-gray-900">{r.name}</div>
            <div className="text-[11px] text-subdued">{m.flat} {r.flat}</div>
          </div>
        </div>
        <dl className="text-xs divide-y divide-gray-100 border-t border-gray-100">
          {/* On a phone the two cards stack, so the last two rows wait for a tall enough panel
              rather than shrinking the reminder — the point of this tab. */}
          {[
            [m.mobile, '01712-345678'],
            [m.monthlyRent, <Amount key="rent" value={r.rent} />],
            [m.startDate, m.startDateValue, 'hidden sm:flex room-380:flex'],
            [m.email, 'rahim@example.com', 'hidden sm:flex room-420:flex'],
          ].map(([k, v, show = 'flex']) => (
            <div key={k} className={`${show} justify-between gap-2 py-2`}>
              <dt className="text-subdued">{k}</dt>
              <dd className="font-semibold text-gray-900 truncate">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div className="rounded-2xl bg-primary-100 p-4 shadow-xl flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </span>
          <div>
            <div className="text-sm font-bold text-primary-800">{label || m.reminder}</div>
            <div className="text-[11px] text-primary-800/70">{m.whenDue}</div>
          </div>
        </div>
        <p className="bg-white rounded-xl p-3 text-xs leading-relaxed text-gray-800 flex-1">
          {m.reminderBody(<Amount value={r.rent} />)}
        </p>
        {badge && (
          <span className="self-start mt-3 px-3 py-1 rounded-full bg-white text-[11px] font-semibold text-primary-700">{badge}</span>
        )}
      </div>
    </div>
  );
};

const Donut = ({ items }) => {
  const m = useMock();
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const r = 48;
  const c = 2 * Math.PI * r;
  const gap = 2; // surface gap between slices
  const segments = items.map((item, i) => ({
    ...item,
    len: (item.amount / total) * c,
    start: (items.slice(0, i).reduce((sum, p) => sum + p.amount, 0) / total) * c,
  }));
  return (
    <div className="relative w-28 h-28 sm:w-44 sm:h-44 shrink-0 @max-2xs:self-center">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden>
        {segments.map(({ label, color, len, start }) => (
          <circle key={label} cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="18"
            strokeDasharray={`${len - gap} ${c - len + gap}`} strokeDashoffset={-start} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] sm:text-[11px] text-subdued">{m.totalSpent}</span>
        <Amount value={total} className="text-xs sm:text-base font-bold text-gray-900" />
      </div>
    </div>
  );
};

const EXPENSE_TOTAL = EXPENSES.reduce((sum, e) => sum + e.amount, 0);
const COLLECTED = 95000;

const ExpensesMockup = () => {
  const m = useMock();
  const expenses = useExpenses();
  return (
  <div className="flex-1 flex flex-col justify-center gap-3">
    {/* Side by side even on a phone: stacked, the chart doubled the height it had to be scaled into.
        Only under 18rem (a 320px phone) does it stack — beside the chart the labels ran into the amounts. */}
    <Card className="flex-1 p-3 sm:p-5 flex flex-col">
      <h4 className="text-sm font-bold text-secondary-700 mb-2 sm:mb-3">{m.month} · {m.spent}</h4>
      <div className="flex-1 flex items-center gap-3 sm:gap-5 @max-2xs:flex-col @max-2xs:items-stretch">
        <Donut items={expenses} />
        <ul className="flex-1 min-w-0 divide-y divide-gray-100">
          {expenses.map((e) => (
            <li key={e.label} className="py-1.5 sm:py-2">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded shrink-0" style={{ backgroundColor: e.color }} />
                <span className="flex-1 min-w-0 leading-tight text-xs sm:text-sm text-gray-700">{e.label}</span>
                <Amount value={e.amount} className="text-xs sm:text-sm font-semibold text-gray-900" />
              </div>
              {/* Each category's share of the month, once there is height for it. */}
              <div className={`${ROOM[340]} mt-1 h-1 rounded-full bg-gray-100 overflow-hidden`}>
                <div className="h-full rounded-full" style={{ width: `${(e.amount / EXPENSE_TOTAL) * 100}%`, backgroundColor: e.color }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
    {/* The month's income against its spending: the "আয়-ব্যয় এক নজরে" the tab promises. */}
    <TotalTiles items={[
      { label: m.collected, value: COLLECTED, tone: 'text-green-700' },
      { label: m.spent, value: EXPENSE_TOTAL, tone: 'text-red-600' },
      { label: m.remaining, value: COLLECTED - EXPENSE_TOTAL, tone: 'text-secondary-700' },
    ]} />
  </div>
  );
};

const STAT_TONES = {
  total: { bg: 'bg-secondary-100', text: 'text-secondary-700' },
  paid: { bg: 'bg-green-50', text: 'text-green-700' },
  due: { bg: 'bg-red-50', text: 'text-red-600' },
};

const MiniStat = ({ label, value, tone }) => (
  <div className={`rounded-lg px-2 py-1.5 @md:px-2.5 @md:py-2 ${STAT_TONES[tone].bg}`}>
    <div className="text-[9px] @md:text-[10px] text-subdued truncate">{label}</div>
    <Amount value={value} className={`text-[11px] @md:text-sm font-bold ${STAT_TONES[tone].text}`} />
  </div>
);

const SIDEBAR_ICONS = [LayoutDashboard, Users, Receipt, Wallet, Bell];
const MONTHLY = [72, 80, 76, 88, 84, 76]; // collection %, last six months

// The laptop's totals sit three to a row in whatever width the screen has left, which on a narrow
// phone is under 150px. So they are sized off that row's own width (cqi) rather than the
// viewport's, and below 10rem the grand total drops out and the other two take the row.
const LaptopStat = ({ label, value, tone, className = '' }) => (
  <div className={`min-w-0 rounded-md px-[clamp(4px,4cqi,10px)] py-[clamp(3px,3cqi,8px)] ${STAT_TONES[tone].bg} ${className}`}>
    <div className="text-[clamp(8px,4.2cqi,11px)] text-subdued truncate">{label}</div>
    <Amount value={value} className={`block text-[clamp(9px,5.6cqi,15px)] font-bold ${STAT_TONES[tone].text}`} />
  </div>
);

/**
 * One composition at every width: the laptop carries the dashboard, and the phone stands in front
 * of its lower-left corner. The laptop is pushed right by roughly the phone's width less its
 * sidebar, so the phone only ever covers the sidebar — never a figure. The ml-*, w-* (sidebar)
 * and w-* (phone) pairs below are sized against each other; change them together.
 *
 * The laptop's screen is a fixed 16:10, so its height follows its width; the dashboard inside is
 * clipped at the bottom the way a real screen's would be, rather than stretching the laptop.
 * A narrow panel with height to spare (a tall phone, or the half-width column on a tall desktop)
 * stacks the two instead of overlapping them, so the laptop can take the full width.
 *
 * Its breakpoints are `@md` — the panel's own width (FitBox is the container), not the window's:
 * at 1024px the panel is half the screen and narrower than on a large phone, and the window-based
 * sizes clipped the totals there.
 */
const DevicesMockup = () => {
  const m = useMock();
  const renters = useRenters();
  return (
  <div className="flex-1 flex flex-col justify-center">
    {/* Laptop */}
    <div className="ml-12 @md:ml-24 @max-md:room-380:ml-0 @max-lg:room-460:ml-0">
      <div className="rounded-t-xl bg-gray-800 p-1.5 @md:p-2">
        <div className="aspect-16/10 rounded-md bg-white overflow-hidden flex">
          <div className="w-9 @md:w-12 shrink-0 bg-secondary-700 py-2.5 @md:py-3 flex flex-col items-center gap-2 @md:gap-2.5">
            {SIDEBAR_ICONS.map((Icon, i) => (
              <span key={i} className={`w-6 h-6 @md:w-8 @md:h-8 shrink-0 rounded-md flex items-center justify-center ${i === 0 ? 'bg-white text-secondary-700' : 'text-white/60'}`}>
                <Icon className="w-3.5 h-3.5 @md:w-4 @md:h-4" aria-hidden />
              </span>
            ))}
          </div>
          <div className="flex-1 min-w-0 p-2 @md:p-4 flex flex-col gap-1.5 @md:gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] @md:text-sm font-bold text-gray-900">{m.dashboard}</span>
              <span className="text-[9px] @md:text-[11px] text-subdued whitespace-nowrap">{m.month}</span>
            </div>
            <div className="@container">
              <div className="grid grid-cols-3 @max-[10rem]:grid-cols-2 gap-1.5">
                <LaptopStat label={m.totalRent} value={125000} tone="total" className="@max-[10rem]:hidden" />
                <LaptopStat label={m.collected} value={95000} tone="paid" />
                <LaptopStat label={m.due} value={30000} tone="due" />
              </div>
            </div>
            {/* Only where the screen is big enough to hold it above a few renters. */}
            <div className="hidden @lg:flex flex-col gap-1">
              <span className="text-[11px] text-subdued">{m.monthlyCollection}</span>
              <div className="h-14 flex items-end gap-1.5">
                {MONTHLY.map((v, i) => (
                  <span key={i} className={`flex-1 rounded-t ${i === MONTHLY.length - 1 ? 'bg-secondary-700' : 'bg-secondary-300'}`}
                    style={{ height: `${v}%` }} />
                ))}
              </div>
            </div>
            {/* A wrapping column: a row that does not fit whole wraps into a second column, which
                is off to the right and clipped — so the list ends on a whole row, never half of one. */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col flex-wrap divide-y divide-gray-100">
              {renters.map((r) => (
                <div key={r.name} className="w-full flex items-center justify-between gap-2 py-1 @md:py-1.5">
                  <span className="text-[11px] @md:text-xs font-semibold text-gray-800 truncate">{r.name}</span>
                  <StatusPill paid={r.paid} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-2 @md:h-2.5 bg-gray-600 rounded-b-xl -mx-2 @md:-mx-3" />
    </div>

    <div className="relative z-10 flex items-end gap-3 -mt-24 @md:-mt-32 @max-md:room-380:mt-3 @max-lg:room-460:mt-4">
      {/* Phone */}
      <div className="w-24 @md:w-36 shrink-0 rounded-[1.25rem] @md:rounded-[1.75rem] bg-gray-800 p-1.5 @md:p-2 shadow-2xl">
        <div className="rounded-[0.95rem] @md:rounded-[1.35rem] bg-white overflow-hidden">
          <div className="bg-secondary-700 text-white text-[10px] @md:text-xs font-semibold text-center pt-3 pb-2 @md:pt-4 @md:pb-2.5">{m.brand}</div>
          <div className="p-1.5 @md:p-2.5 space-y-1.5 @md:space-y-2">
            <MiniStat label={m.collected} value={95000} tone="paid" />
            <MiniStat label={m.due} value={30000} tone="due" />
            <div className="text-center pt-0.5 pb-1">
              <span className="inline-block px-2 @md:px-3 py-0.5 @md:py-1 rounded-full bg-primary text-white text-[9px] @md:text-[10px] font-semibold">{m.inBengali}</span>
            </div>
          </div>
        </div>
      </div>
      <p className="flex-1 min-w-0 pb-1 flex items-center gap-1.5 @md:gap-2 text-xs @md:text-sm font-semibold text-white">
        <RefreshCw className="w-4 h-4 shrink-0 text-primary-300" aria-hidden />
        {m.sameAccounts}
      </p>
    </div>
  </div>
  );
};

// The Landing Page Editor offers these keys in its MOCKUP_LABELS — add a mockup in both places.
const MOCKUPS = {
  overview: OverviewMockup,
  receipt: ReceiptMockup,
  status: StatusMockup,
  reminder: ReminderMockup,
  expenses: ExpensesMockup,
  devices: DevicesMockup,
};

// ── Fit-to-box ─────────────────────────────────────────────────────────────────

/**
 * Scales its child down (never up) until it fits the box. The section is pinned at exactly one
 * screen tall, so the mockup gets whatever height is left after the copy — on a short phone
 * that can be a third of what it was drawn for. Scaling keeps it whole rather than clipped.
 *
 * The other direction is handled in CSS: the child is at least the box's height, and the box is
 * the `showcase` size container behind the `room-*` variants, so on a tall screen the mockup
 * stretches and adds rows instead of leaving the panel half empty.
 *
 * Absolutely positioned, so the parent must be `relative` and give it a size — which also makes
 * size containment safe here: the box never takes its size from its content.
 */
const FitBox = ({ className = '', children }) => {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    // offsetHeight ignores the transform, so this measures the natural size every time.
    const measure = () => {
      const next = Math.min(1, outer.clientHeight / inner.offsetHeight, outer.clientWidth / inner.offsetWidth);
      setScale((prev) => (Math.abs(prev - next) < 0.005 ? prev : next));
    };
    // Observing the inner box too: switching tabs swaps the mockup without resizing the outer.
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className={`absolute flex items-center justify-center ${className}`}
      style={{ containerType: 'size', containerName: 'showcase' }}>
      <div ref={innerRef} className="w-full max-w-xl min-h-full shrink-0 flex flex-col" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
};

// ── Section ────────────────────────────────────────────────────────────────────

// Scroll distance each tab holds the pinned stage for, in small-viewport-height units.
const STEP_SVH = 70;

const clamp01 = (n) => Math.min(1, Math.max(0, n));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The tab plus which way the visitor was going when it changed, so the slide-ins can follow
// the scroll: forward, the copy comes in from the left and the mockup from the right; back
// up, both mirror.
const toTab = (next) => (prev) =>
  (prev.index === next ? prev : { index: next, dir: next > prev.index ? 1 : -1 });

/**
 * Scroll-driven, ScrollTrigger-style, without the library: the track is one screen plus one
 * STEP per tab tall, and the stage inside it is `position: sticky`, so it stays pinned while
 * the page scrolls through the track. Progress through the track picks the tab; scrolling on
 * past the last tab releases the pin.
 *
 * Per-frame work (progress bar, the panel's parallax circles) is written straight to the DOM
 * from a rAF-throttled scroll handler; React only re-renders when the tab actually changes.
 */
const Showcase = ({ data = {} }) => {
  const { i18n } = useTranslation();
  const copy = COPY[landingLocale(i18n.language)];
  const tabs = data.tabs || [];
  const count = tabs.length;
  const [view, setView] = useState({ index: 0, dir: 1 });
  const active = view.index;
  const [navHeight, setNavHeight] = useState(0);

  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const barRef = useRef(null);
  const circleARef = useRef(null);
  const circleBRef = useRef(null);
  const stripRef = useRef(null);
  const tabRefs = useRef([]);

  // The landing nav is sticky too; the stage pins just below it rather than underneath.
  useEffect(() => {
    const nav = document.querySelector('[data-landing-nav]');
    if (!nav) return undefined;
    const ro = new ResizeObserver(() => setNavHeight(nav.offsetHeight));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!count) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage) return;
      const range = track.offsetHeight - stage.offsetHeight;
      const progress = range > 0 ? clamp01((navHeight - track.getBoundingClientRect().top) / range) : 0;
      const next = Math.min(count - 1, Math.floor(progress * count));
      setView(toTab(next));
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      if (circleARef.current) circleARef.current.style.transform = `translate3d(0, ${progress * 90}px, 0)`;
      if (circleBRef.current) circleBRef.current.style.transform = `translate3d(${progress * 60}px, ${progress * -70}px, 0)`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [count, navHeight]);

  // Keep the active tab in view inside the strip. Scrolls the strip only — scrollIntoView
  // would also move the window, fighting the user's own scroll.
  useEffect(() => {
    const strip = stripRef.current;
    const tab = tabRefs.current[active];
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({
      left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [active]);

  if (!count) return null;

  const index = Math.min(active, count - 1);
  const tab = tabs[index];
  const Mockup = MOCKUPS[tab.mockup] || OverviewMockup;
  const copyIn = view.dir > 0 ? 'animate-showcase-from-left' : 'animate-showcase-from-right';
  const mockupIn = view.dir > 0 ? 'animate-showcase-from-right' : 'animate-showcase-from-left';

  // A tab is a position on the page, so choosing one scrolls there — to the middle of its
  // stretch, so a small overshoot does not land on the neighbour.
  const goTo = (i) => {
    const track = trackRef.current;
    const range = track.offsetHeight - stageRef.current.offsetHeight;
    if (range <= 0) { setView(toTab(i)); return; }
    const trackTop = track.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({
      top: trackTop + ((i + 0.5) / count) * range,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  // Arrow keys move between tabs, as the WAI-ARIA tabs pattern expects.
  const onKeyDown = (e) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + count) % count;
    goTo(next);
    tabRefs.current[next]?.focus();
  };

  // svh, not vh: on a phone vh is the height with the browser bars hidden, which would push the
  // bottom of a "one screen" stage under the address bar.
  const stageHeight = `calc(100svh - ${navHeight}px)`;

  return (
    <section id="showcase" ref={trackRef} className="relative bg-white"
      style={{ height: `calc(${stageHeight} + ${count * STEP_SVH}svh)` }}>
      <div ref={stageRef} className="sticky overflow-hidden flex flex-col" style={{ top: navHeight, height: stageHeight }}>
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-5 pt-4 sm:pt-8 pb-3 sm:pb-6 flex flex-col flex-1 min-h-0">
          {/* The active tab's own headline is the section heading — it changes with the scroll.
              Two lines reserved on a phone, so a one-line headline does not pull the tabs up
              and make everything below jump. */}
          <div key={`head-${index}`} className={`text-center shrink-0 ${copyIn}`}>
            <h2 className="min-h-[2.5em] lg:min-h-0 flex items-center justify-center text-xl sm:text-3xl md:text-4xl font-medium text-ink leading-snug">
              {tab.title}
            </h2>
            {tab.subtitle && <p className="showcase-short-hide hidden sm:block text-ink-soft sm:text-lg max-w-2xl mx-auto mt-2 sm:mt-3">{tab.subtitle}</p>}
          </div>

          {/* One row at every width: it scrolls on a phone (scrollbar hidden — the active tab is
              kept in view instead) and has room to sit centred from lg up. */}
          <div ref={stripRef} role="tablist" aria-label={data.title} onKeyDown={onKeyDown}
            className="relative shrink-0 flex gap-2 overflow-x-auto lg:justify-center mt-3 sm:mt-6 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t, i) => (
              <button key={i} ref={(el) => { tabRefs.current[i] = el; }}
                role="tab" id={`showcase-tab-${i}`} aria-selected={i === index} aria-controls="showcase-panel"
                tabIndex={i === index ? 0 : -1} onClick={() => goTo(i)}
                className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[13px] sm:text-sm font-medium border transition-colors ${
                  i === index
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-slate-200 text-ink-soft hover:border-primary hover:text-primary'
                }`}>
                {t.tab}
              </button>
            ))}
          </div>

          {/* Scrubbed with the scroll, so it shows how much of the section is left. */}
          <div aria-hidden className="shrink-0 h-1 rounded-full bg-gray-100 overflow-hidden mt-2.5 sm:mt-4 mb-3 sm:mb-6">
            <div ref={barRef} className="h-full bg-primary origin-left" style={{ transform: 'scaleX(0)' }} />
          </div>

          <div role="tabpanel" id="showcase-panel" aria-labelledby={`showcase-tab-${index}`}
            className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-5 lg:grid lg:grid-cols-2 lg:gap-12">
            <div key={`text-${index}`} className={`shrink-0 lg:self-center ${copyIn}`} style={{ animationDelay: '60ms' }}>
              {/* The column holds only the points now that the headline sits above the tabs, so
                  they are set a size up on a wide screen to carry it. */}
              <ul className="showcase-compact-hide space-y-1.5 sm:space-y-3 lg:space-y-4">
                {(tab.points || []).map((pt, i) => (
                  <li key={i} className="flex gap-2 sm:gap-3 text-sm sm:text-base lg:text-lg leading-snug text-ink-soft">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-primary" aria-hidden />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The flyers' teal panel and circles, so the section still reads as the client's material. */}
            <div className="relative flex-1 min-h-0 rounded-2xl sm:rounded-3xl bg-secondary-700 overflow-hidden">
              <div ref={circleARef} aria-hidden className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 will-change-transform" />
              <div ref={circleBRef} aria-hidden className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-white/5 will-change-transform" />
              <FitBox className="inset-3 sm:inset-6 lg:inset-8">
                <div key={`mockup-${index}`} className={`flex-1 flex flex-col ${mockupIn}`} style={{ animationDelay: '120ms' }}>
                  <MockCopy.Provider value={copy}>
                    <Mockup label={tab.mockup_label} badge={tab.mockup_badge} />
                  </MockCopy.Provider>
                </div>
              </FitBox>
            </div>
          </div>

          {data.sample_note && <p className="shrink-0 text-center text-[11px] sm:text-xs text-slate-400 mt-2 sm:mt-4">{data.sample_note}</p>}
        </div>
      </div>
    </section>
  );
};

export default Showcase;
