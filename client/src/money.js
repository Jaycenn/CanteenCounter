// Whole-peso amounts drop the “.00” so the big total stays as short
// and readable as possible from across the counter.
export function peso(cents) {
  const value = cents / 100;
  return (
    '₱' +
    value.toLocaleString('en-PH', {
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}
