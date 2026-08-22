import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import StatsCardModal from "./StatsCardModal";

export default function StatsCardGrid({ stats = [] }) {
  // Which card's modal is open, by index — the card owns the data it hands over.
  const [openIdx, setOpenIdx] = useState(null);
  const { i18n } = useTranslation();
  const isBengali = i18n.language?.startsWith('bn');

  const active = openIdx == null ? null : stats[openIdx];

  return (
    <div className={`grid grid-cols-4 gap-2 mt-3 ${isBengali ? 'font-hind-siliguri' : 'font-mooli'}`}>
      {stats.map(({ label, value, icon: Icon }, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => setOpenIdx(idx)}
          aria-haspopup="dialog"
          className={`relative flex flex-col items-center justify-center text-center bg-primary-100/20 border border-primary-200 rounded-sm py-2 px-1 shadow-sm cursor-pointer
            transition-all hover:border-primary-400 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40
            ${idx === 0 ? 'rounded-tl-xl rounded-bl-xl' : ''} ${idx === stats.length - 1 ? 'rounded-tr-xl rounded-br-xl' : ''}`}
        >
          <div className="w-12 h-12 mb-2 flex items-center justify-center">
            <img className="w-10 h-10" src={Icon} alt="" />
          </div>
          <p className={`text-[0.7rem] sm:text-sm text-text/90 font-bold h-10 md:text-sm text-wrap ${isBengali ? 'font-hind-siliguri' : 'font-roboto'} flex items-center justify-center`}>
            {label}
          </p>
          <p className="text-2xl font-bold text-black/70 mt-1 text-shadow-lg/7 font-poppins">
            {value}
          </p>
        </button>
      ))}

      <StatsCardModal
        open={active != null}
        onClose={() => setOpenIdx(null)}
        cardFor={active?.hover?.cardFor}
        label={active?.label}
        value={active?.value}
        houses={active?.hover?.houses ?? []}
        renters={active?.hover?.renters ?? []}
        caretakers={active?.hover?.caretakers ?? []}
      />
    </div>
  );
}
