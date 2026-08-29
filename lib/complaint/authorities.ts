/**
 * Anti-corruption authorities a citizen can complain to. Addresses are taken
 * from the bodies' public websites. Entries marked `verify: true` should be
 * re-checked before relying on them; contact details change.
 */
export interface Authority {
  name: string;
  role: string;
  email?: string;
  address: string;
  website?: string;
  verify?: boolean;
}

export const CVC: Authority = {
  name: "Central Vigilance Commission",
  role: "National anti-corruption body (central government employees and PSUs)",
  email: "complaints@cvc.nic.in",
  address: "Satarkta Bhawan, GPO Complex, Block A, INA, New Delhi 110023",
  website: "https://cvc.gov.in",
};

export const STATE_AUTHORITIES: Record<string, Authority[]> = {
  KA: [
    {
      name: "Karnataka Lokayukta",
      role: "State anti-corruption ombudsman",
      email: "lokayukta@karnataka.gov.in",
      address: "M.S. Building, Dr. B.R. Ambedkar Veedhi, Bengaluru 560001",
      website: "https://lokayukta.karnataka.gov.in",
    },
  ],
  MH: [
    {
      name: "Maharashtra Anti Corruption Bureau",
      role: "State anti-corruption investigation agency",
      address: "Sir Pochkhanwala Road, Worli, Mumbai 400030",
      website: "https://acbmaharashtra.gov.in",
      verify: true,
    },
    {
      name: "Lokayukta Maharashtra",
      role: "State ombudsman",
      address: "New Administrative Building, Madam Cama Road, Mumbai 400032",
      verify: true,
    },
  ],
  UP: [
    {
      name: "Uttar Pradesh Lokayukta",
      role: "State ombudsman",
      address: "Lokayukta Sangathan, Vikas Bhawan, Lucknow 226001",
      website: "https://uplokayukta.up.nic.in",
      verify: true,
    },
    { name: "Uttar Pradesh Vigilance Establishment", role: "State anti-corruption agency", address: "Vigilance Bhawan, Gomti Nagar, Lucknow", verify: true },
  ],
  TG: [
    {
      name: "Telangana Anti Corruption Bureau",
      role: "State anti-corruption agency",
      address: "ACB Bhavan, Lower Tank Bund Road, Hyderabad 500080",
      website: "https://acb.telangana.gov.in",
      verify: true,
    },
  ],
  DL: [
    {
      name: "Anti Corruption Branch, Government of NCT of Delhi",
      role: "State anti-corruption agency",
      address: "Level 4, C Wing, Delhi Secretariat, IP Estate, New Delhi 110002",
      website: "https://acb.delhi.gov.in",
      verify: true,
    },
    { name: "Lokayukta Delhi", role: "State ombudsman", address: "Lokayukta Office, 2nd Floor, C Block, Vikas Bhawan, IP Estate, New Delhi 110002", verify: true },
  ],
  TN: [
    {
      name: "Directorate of Vigilance and Anti Corruption, Tamil Nadu",
      role: "State anti-corruption agency",
      address: "No. 293, MKN Road, Alandur, Chennai 600016",
      website: "https://dvac.tn.gov.in",
      verify: true,
    },
    { name: "Tamil Nadu Lokayukta", role: "State ombudsman", address: "Lokayukta Office, Chennai", verify: true },
  ],
  AP: [
    { name: "Andhra Pradesh Anti Corruption Bureau", role: "State anti-corruption agency", address: "ACB Head Office, Amaravati", website: "https://acb.ap.gov.in", verify: true },
  ],
  GJ: [
    { name: "Gujarat Anti Corruption Bureau", role: "State anti-corruption agency", address: "ACB Bhavan, Gandhinagar", website: "https://acb.gujarat.gov.in", verify: true },
    { name: "Gujarat Lokayukta", role: "State ombudsman", address: "Lokayukta Office, Gandhinagar", verify: true },
  ],
  HR: [
    { name: "Haryana State Vigilance Bureau", role: "State anti-corruption agency", address: "State Vigilance Bureau, Sector 17, Panchkula", verify: true },
    { name: "Haryana Lokayukta", role: "State ombudsman", address: "Lokayukta Office, Chandigarh", verify: true },
  ],
  RJ: [
    { name: "Rajasthan Anti Corruption Bureau", role: "State anti-corruption agency", address: "ACB Headquarters, Jhalana Institutional Area, Jaipur 302004", website: "https://acb.rajasthan.gov.in", verify: true },
    { name: "Rajasthan Lokayukta", role: "State ombudsman", address: "Lokayukta Sachivalaya, Jaipur", verify: true },
  ],
  WB: [
    { name: "West Bengal Anti Corruption Branch", role: "State anti-corruption agency", address: "Bhabani Bhawan, Alipore, Kolkata 700027", verify: true },
  ],
  MP: [
    { name: "Madhya Pradesh Lokayukta", role: "State ombudsman", address: "Lokayukta Sangathan, Bhopal 462003", website: "https://mplokayukt.nic.in", verify: true },
  ],
  KL: [
    { name: "Kerala Lokayukta", role: "State ombudsman", address: "Lokayukta Bhavan, Vellayambalam, Thiruvananthapuram 695010", verify: true },
    { name: "Vigilance and Anti Corruption Bureau, Kerala", role: "State anti-corruption agency", address: "VACB Headquarters, Thiruvananthapuram", website: "https://vigilance.kerala.gov.in", verify: true },
  ],
  BR: [
    { name: "Bihar Vigilance Investigation Bureau", role: "State anti-corruption agency", address: "Vigilance Bhawan, Patna", verify: true },
    { name: "Bihar Lokayukta", role: "State ombudsman", address: "Lokayukta Office, Patna", verify: true },
  ],
  PB: [{ name: "Punjab Vigilance Bureau", role: "State anti-corruption agency", address: "Vigilance Bhawan, Sector 68, Mohali", verify: true }],
  OR: [{ name: "Odisha Lokayukta", role: "State ombudsman", address: "Lokayukta Bhawan, Bhubaneswar", verify: true }],
  JH: [{ name: "Jharkhand Anti Corruption Bureau", role: "State anti-corruption agency", address: "ACB Headquarters, Ranchi", verify: true }],
};

export function authoritiesFor(stateCode: string): Authority[] {
  const state = STATE_AUTHORITIES[stateCode] ?? [];
  return [...state, CVC];
}
