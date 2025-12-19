import React from "react";

export default function StatsCardGrid({ stats = [] }) {
  return (
    <div className="grid grid-cols-4 gap-3 mt-3 font-mooli">
      {stats.map(({ label, value, icon: Icon }, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center justify-center text-center bg-primary-100/40 border border-primary-500 rounded-lg p-2 shadow-sm"
        >
          <div className="w-12 h-12 mb-2 flex items-center justify-center">
            <img className="w-10 h-10" src={Icon} />
          </div>
          <p className="text-[0.6rem] xs:text-sm md:text-sm text-text/60 font-bold h-10 md:text-sm text-wrap font-oswald flex items-center justify-center">
            {label}
          </p>
          <p className="text-2xl font-bold text-black/60 mt-1 text-shadow-lg/7 font-poppins">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
