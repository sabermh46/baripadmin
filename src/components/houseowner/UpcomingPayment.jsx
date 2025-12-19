const mockUpcoming = [
  { name: "Flat A1", building: "Nikunja", due: "3 days left" },
  { name: "Flat B2", building: "Proshanti", due: "5 days left" },
  { name: "Flat C3", building: "Kuhelika", due: "7 days left" },
];

export default function UpcomingPayments() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-3 text-primary font-oswald">
        ⏰ Upcoming Rent Deadlines
      </h3>

      <div className="space-y-3 font-oswald">
        {mockUpcoming.map((item, idx) => (
          <div
            key={idx}
            className="px-3 py-2 border border-primary/50 rounded-xl flex justify-between items-center"
          >
            <div className="flex flex-col">
                <span className="font-medium text-lg font-poppins text-slate-700">{item.name}</span>
                <span className="font-medium text-xs font-poppins text-secondary">{item.building}</span>
            </div>
            <span className="text-orange-600 text-sm font-semibold">
              {item.due}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
