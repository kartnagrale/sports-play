export const formatCr = (v: number): string => {
  if (v == null || isNaN(v)) return "—";
  const crore = 10_000_000;
  const lakh = 100_000;
  if (v >= crore) return `₹${(v / crore).toFixed(2)} Cr`;
  if (v >= lakh) return `₹${(v / lakh).toFixed(1)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
