export function generateYearlyRentData(houses) {
  const yearlyData = {};

  for (let month = 1; month <= 12; month++) {
    yearlyData[month] = houses.map((h) => {
      const max = h.total_flat;
      const collected = Math.floor(Math.random() * (max + 1));

      return {
        ...h,
        rent_collected: collected,
      };
    });
  }

  return yearlyData;
}
