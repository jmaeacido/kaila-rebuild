export function formatMatchBudget(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Open to offers";
  const peso = (value: number | null) => (value === null ? "—" : `₱${(value / 100).toLocaleString()}`);
  return `${peso(min)} – ${peso(max)}`;
}
