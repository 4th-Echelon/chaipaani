/** Controlled vocabulary: departments, states/UTs (ISO 3166-2:IN codes), seed cities. */

export const DEPARTMENT_SEED = [
  { slug: "police", name: "Police", short: "P" },
  { slug: "rto", name: "RTO", short: "R" },
  { slug: "revenue-land-records", name: "Revenue / Land Records", short: "R/" },
  { slug: "passport-office", name: "Passport Office", short: "PO" },
  { slug: "municipal-corporation", name: "Municipal Corporation", short: "MC" },
  { slug: "electricity-board", name: "Electricity Board", short: "EB" },
  { slug: "income-tax", name: "Income Tax", short: "IT" },
  { slug: "food-drug-administration", name: "Food & Drug Administration", short: "FDA" },
  { slug: "gst-office", name: "GST Office", short: "GST" },
  { slug: "other", name: "Other", short: "?" },
] as const;

export const STATE_SEED: { code: string; name: string }[] = [
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CT", name: "Chhattisgarh" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OR", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TG", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UT", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
  // Union territories
  { code: "AN", name: "Andaman & Nicobar Islands" },
  { code: "CH", name: "Chandigarh" },
  { code: "DH", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "DL", name: "Delhi" },
  { code: "JK", name: "Jammu & Kashmir" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "PY", name: "Puducherry" },
];

export const STATE_NAMES: string[] = STATE_SEED.map((s) => s.name);

const byName = new Map(STATE_SEED.map((s) => [s.name.toLowerCase(), s.code]));
const byCode = new Map(STATE_SEED.map((s) => [s.code, s.name]));

/** Accepts a code ("TN") or a name ("Tamil Nadu"); returns the code or null. */
export function resolveStateCode(input: string | undefined | null): string | null {
  if (!input) return null;
  const t = input.trim();
  if (byCode.has(t.toUpperCase())) return t.toUpperCase();
  return byName.get(t.toLowerCase()) ?? null;
}
export function stateName(code: string): string {
  return byCode.get(code) ?? code;
}

export const CITY_SEED: { name: string; state: string }[] = [
  { name: "Bengaluru", state: "KA" }, { name: "Mysuru", state: "KA" }, { name: "Hubballi", state: "KA" }, { name: "Mangaluru", state: "KA" },
  { name: "Mumbai", state: "MH" }, { name: "Pune", state: "MH" }, { name: "Nagpur", state: "MH" }, { name: "Nashik", state: "MH" }, { name: "Thane", state: "MH" },
  { name: "Lucknow", state: "UP" }, { name: "Hapur", state: "UP" }, { name: "Noida", state: "UP" }, { name: "Kanpur", state: "UP" }, { name: "Varanasi", state: "UP" }, { name: "Ghaziabad", state: "UP" }, { name: "Agra", state: "UP" },
  { name: "Hyderabad", state: "TG" }, { name: "Warangal", state: "TG" },
  { name: "Delhi", state: "DL" },
  { name: "Chennai", state: "TN" }, { name: "Coimbatore", state: "TN" }, { name: "Vellore", state: "TN" }, { name: "Madurai", state: "TN" }, { name: "Tiruchirappalli", state: "TN" },
  { name: "Vijayawada", state: "AP" }, { name: "Visakhapatnam", state: "AP" }, { name: "Tirupati", state: "AP" },
  { name: "Ahmedabad", state: "GJ" }, { name: "Vadodara", state: "GJ" }, { name: "Surat", state: "GJ" }, { name: "Rajkot", state: "GJ" },
  { name: "Gurgaon", state: "HR" }, { name: "Faridabad", state: "HR" }, { name: "Panipat", state: "HR" },
  { name: "Jaipur", state: "RJ" }, { name: "Jodhpur", state: "RJ" }, { name: "Udaipur", state: "RJ" }, { name: "Kota", state: "RJ" },
  { name: "Kolkata", state: "WB" }, { name: "Howrah", state: "WB" }, { name: "Siliguri", state: "WB" },
  { name: "Patna", state: "BR" }, { name: "Gaya", state: "BR" },
  { name: "Panaji", state: "GA" }, { name: "Margao", state: "GA" },
  { name: "Ramban", state: "JK" }, { name: "Srinagar", state: "JK" }, { name: "Jammu", state: "JK" },
  { name: "Ranchi", state: "JH" }, { name: "Jamshedpur", state: "JH" },
  { name: "Bhopal", state: "MP" }, { name: "Indore", state: "MP" }, { name: "Gwalior", state: "MP" },
  { name: "Guwahati", state: "AS" },
  { name: "Shimla", state: "HP" },
  { name: "Kochi", state: "KL" }, { name: "Thiruvananthapuram", state: "KL" }, { name: "Kozhikode", state: "KL" },
  { name: "Bhubaneswar", state: "OR" }, { name: "Cuttack", state: "OR" },
  { name: "Chandigarh", state: "CH" }, { name: "Ludhiana", state: "PB" }, { name: "Amritsar", state: "PB" },
  { name: "Dehradun", state: "UT" }, { name: "Raipur", state: "CT" }, { name: "Puducherry", state: "PY" },
];
