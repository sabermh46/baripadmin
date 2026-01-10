import { ChevronLeft, ChevronRight, Info, Check } from "lucide-react";

export default function RentCollectionProgress({
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  houses = [],
  onMonthChange = () => {},
  maxDate = { month: new Date().getMonth() + 1, year: new Date().getFullYear() }
}) {
  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
  });

  // Check if right arrow should be disabled
  const isCurrentMonth = month === maxDate.month && year === maxDate.year;
  
  // Calculate previous and next month/year
  const handlePrevious = () => {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    onMonthChange(prevMonth, prevYear);
  };

  const handleNext = () => {
    if (isCurrentMonth) return; // Disabled for current month
    
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }
    onMonthChange(nextMonth, nextYear);
  };

  // tailwind color class map based on % range
  const getIconColorClass = (percent) => {
    if (percent <= 12.5) return "bg-red-500";
    if (percent <= 25) return "bg-red-400";
    if (percent <= 37.5) return "bg-yellow-400";
    if (percent <= 50) return "bg-yellow-300";
    if (percent <= 62.5) return "bg-sky-400";
    if (percent <= 75) return "bg-blue-400";
    if (percent <= 87.5) return "bg-green-400";
    return "bg-green-600"; // ✅ highest tier
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevious}
          className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200"
        >
          <ChevronLeft className="w-8 h-8 text-gray-700" />
        </button>

        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          {monthName} - {year}
        </h2>

        <button
          onClick={handleNext}
          disabled={isCurrentMonth}
          className={`p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 ${
            isCurrentMonth ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <ChevronRight className="w-8 h-8 text-gray-700" />
        </button>
      </div>

      {/* List */}
      <div className="space-y-5 font-mooli">
        {houses.map((house, idx) => {
          // Calculate percentage
          const totalFlats = house.totalFlats || house.total_flat || 0;
          const rentCollected = house.rentCollected || house.rent_collected || 0;
          
          // Handle case when totalFlats is 0 to avoid division by zero
          const collectedPercent = totalFlats > 0 
            ? Math.round((rentCollected / totalFlats) * 100)
            : 0;
          
          const remainingPercent = 100 - collectedPercent;
          const collectedColor =
            collectedPercent === 100
              ? "bg-green-500"
              : "bg-primary-600";
          const iconColorClass = getIconColorClass(collectedPercent);

          return (
            <div key={house.houseId || idx} className="relative flex gap-2 items-center">
              {/* House Name */}
              <div className="text-[var(--color-text)] font-medium line-clamp-1 mb-1 max-w-[100px] w-[80px] md:max-w-[250px] lg:max-w-[300px] font-poppins text-sm md:text-base">
                {house.name && house.name.length > 10 
                  ? house.name.slice(0, 8) + "..." 
                  : house.name || `House ${idx + 1}`}
              </div>

              {/* Progress Bar */}
              <div className="relative flex-1 h-6 rounded-full bg-primary-200 overflow-hidden flex text-[0.6rem] font-medium">
                {/* Collected Portion */}
                <div
                  className={`h-full ${collectedColor} text-white flex items-center justify-center 
                  transition-all duration-500 ease-out`}
                  style={{ width: `${collectedPercent}%` }}
                >
                  {collectedPercent > 50
                    ? `${collectedPercent}% Collected`
                    : collectedPercent > 0 && collectedPercent !== 50
                    ? `${collectedPercent}%`
                    : ""}
                </div>

                {/* Remaining Portion */}
                {remainingPercent > 0 && (
                  <div
                    className="h-full text-black flex items-center justify-center bg-primary-200 
                    line-clamp-1 transition-all duration-500 ease-out"
                    style={{ width: `${remainingPercent}%` }}
                  >
                    {collectedPercent < 50
                      ? `${remainingPercent}% Remaining`
                      : remainingPercent > 0 && collectedPercent !== 50
                      ? `${remainingPercent}%`
                      : ""}
                  </div>
                )}

              </div>

              {/* Right-side status icon */}
              <div className=" mt-[2px] flex items-center justify-center">
                <div
                  className={`w-6 h-6 ${iconColorClass} text-white rounded-full flex items-center justify-center`}
                >
                  {collectedPercent === 100 ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}