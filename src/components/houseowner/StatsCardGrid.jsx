import React from "react";

export default function StatsCardGrid({ stats = [] }) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-3 font-mooli">
      {stats.map(({ label, value, icon: Icon }, idx) => (
        <div
          key={idx}
          className={`flex flex-col items-center justify-center text-center bg-primary-100/20 border border-primary-200 rounded-sm py-2 px-1 shadow-sm
            ${idx === 0 ? 'rounded-tl-xl rounded-bl-xl' : ''} ${idx === stats.length -1 ? 'rounded-tr-xl rounded-br-xl' : ''  }`}
        >
          <div className="w-12 h-12 mb-2 flex items-center justify-center">
            <img className="w-10 h-10" src={Icon} />
          </div>
          <p className="text-[0.7rem] sm:text-sm text-text/90 font-bold h-10 md:text-sm text-wrap font-roboto flex items-center justify-center">
            {label}
          </p>
          <p className="text-2xl font-bold text-black/70 mt-1 text-shadow-lg/7 font-poppins">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
