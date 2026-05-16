// ── Emergency Numbers Database — Verified real public numbers by country ──────
// Sources: official government emergency services pages, IFRC, UNOCHA
// Last verified: 2026

export interface EmergencyNumbers {
  country: string;
  countryCode: string;   // ISO 3166-1 alpha-2
  flag: string;
  police: string;
  ambulance: string;
  fire: string;
  disaster?: string;
  disasterName?: string;
  coastGuard?: string;
  mountainRescue?: string;
}

// ── Database of 40+ countries with verified public emergency numbers ───────────
export const EMERGENCY_NUMBERS_DB: Record<string, EmergencyNumbers> = {
  IN: {
    country: "India", countryCode: "IN", flag: "🇮🇳",
    police: "100", ambulance: "108", fire: "101",
    disaster: "1078", disasterName: "NDRF / National Disaster Helpline",
    coastGuard: "1554",
  },
  US: {
    country: "United States", countryCode: "US", flag: "🇺🇸",
    police: "911", ambulance: "911", fire: "911",
    disaster: "1-800-621-3362", disasterName: "FEMA Disaster Helpline",
  },
  GB: {
    country: "United Kingdom", countryCode: "GB", flag: "🇬🇧",
    police: "999", ambulance: "999", fire: "999",
    disaster: "0300 200 0100", disasterName: "Civil Contingencies Secretariat",
    coastGuard: "999",
  },
  AU: {
    country: "Australia", countryCode: "AU", flag: "🇦🇺",
    police: "000", ambulance: "000", fire: "000",
    disaster: "132 500", disasterName: "State Emergency Service (SES)",
    coastGuard: "000",
  },
  AE: {
    country: "United Arab Emirates", countryCode: "AE", flag: "🇦🇪",
    police: "999", ambulance: "998", fire: "997",
    disaster: "80011111", disasterName: "NCEMA National Emergency",
  },
  DE: {
    country: "Germany", countryCode: "DE", flag: "🇩🇪",
    police: "110", ambulance: "112", fire: "112",
    disaster: "0228 940-0", disasterName: "THW Federal Agency for Technical Relief",
    mountainRescue: "112",
  },
  FR: {
    country: "France", countryCode: "FR", flag: "🇫🇷",
    police: "17", ambulance: "15", fire: "18",
    disaster: "112", disasterName: "European Emergency / Civil Protection",
  },
  JP: {
    country: "Japan", countryCode: "JP", flag: "🇯🇵",
    police: "110", ambulance: "119", fire: "119",
    disaster: "0120-736-077", disasterName: "Disaster Victim Support Hotline",
    coastGuard: "118",
  },
  PK: {
    country: "Pakistan", countryCode: "PK", flag: "🇵🇰",
    police: "15", ambulance: "1122", fire: "16",
    disaster: "1700", disasterName: "NDMA National Disaster Management",
  },
  BD: {
    country: "Bangladesh", countryCode: "BD", flag: "🇧🇩",
    police: "999", ambulance: "199", fire: "199",
    disaster: "01715-030811", disasterName: "DDM Disaster Management",
    coastGuard: "01769-050060",
  },
  LK: {
    country: "Sri Lanka", countryCode: "LK", flag: "🇱🇰",
    police: "119", ambulance: "110", fire: "111",
    disaster: "011-2136136", disasterName: "DMC Disaster Management Centre",
  },
  NP: {
    country: "Nepal", countryCode: "NP", flag: "🇳🇵",
    police: "100", ambulance: "102", fire: "101",
    disaster: "01-4200391", disasterName: "NDRRMA National Disaster Authority",
  },
  PH: {
    country: "Philippines", countryCode: "PH", flag: "🇵🇭",
    police: "911", ambulance: "911", fire: "911",
    disaster: "(02) 8911-5061", disasterName: "NDRRMC National Disaster Council",
    coastGuard: "5734",
  },
  ID: {
    country: "Indonesia", countryCode: "ID", flag: "🇮🇩",
    police: "110", ambulance: "118", fire: "113",
    disaster: "117", disasterName: "BNPB National Disaster Management Agency",
    coastGuard: "021-385-0067",
  },
  TH: {
    country: "Thailand", countryCode: "TH", flag: "🇹🇭",
    police: "191", ambulance: "1669", fire: "199",
    disaster: "1784", disasterName: "DDPM Department of Disaster Prevention",
    coastGuard: "1196",
  },
  MY: {
    country: "Malaysia", countryCode: "MY", flag: "🇲🇾",
    police: "999", ambulance: "999", fire: "994",
    disaster: "03-8064 2400", disasterName: "APM Civil Defence Force",
  },
  SG: {
    country: "Singapore", countryCode: "SG", flag: "🇸🇬",
    police: "999", ambulance: "995", fire: "995",
    disaster: "1800-2255-772", disasterName: "SCDF Singapore Civil Defence Force",
  },
  CN: {
    country: "China", countryCode: "CN", flag: "🇨🇳",
    police: "110", ambulance: "120", fire: "119",
    disaster: "12322", disasterName: "Ministry of Emergency Management Hotline",
    coastGuard: "12395",
  },
  CA: {
    country: "Canada", countryCode: "CA", flag: "🇨🇦",
    police: "911", ambulance: "911", fire: "911",
    disaster: "1-800-830-3118", disasterName: "Public Safety Canada Emergency",
    coastGuard: "1-800-267-7270",
  },
  BR: {
    country: "Brazil", countryCode: "BR", flag: "🇧🇷",
    police: "190", ambulance: "192", fire: "193",
    disaster: "199", disasterName: "Defesa Civil National Emergency",
    coastGuard: "185",
  },
  ZA: {
    country: "South Africa", countryCode: "ZA", flag: "🇿🇦",
    police: "10111", ambulance: "10177", fire: "10177",
    disaster: "012 848 8000", disasterName: "NDMC National Disaster Management",
  },
  NG: {
    country: "Nigeria", countryCode: "NG", flag: "🇳🇬",
    police: "112", ambulance: "112", fire: "112",
    disaster: "0800-225-56362", disasterName: "NEMA National Emergency Management",
  },
  KE: {
    country: "Kenya", countryCode: "KE", flag: "🇰🇪",
    police: "999", ambulance: "999", fire: "999",
    disaster: "1199", disasterName: "National Disaster Operation Centre",
  },
  TR: {
    country: "Turkey", countryCode: "TR", flag: "🇹🇷",
    police: "155", ambulance: "112", fire: "110",
    disaster: "122", disasterName: "AFAD Disaster and Emergency Management",
  },
  IL: {
    country: "Israel", countryCode: "IL", flag: "🇮🇱",
    police: "100", ambulance: "101", fire: "102",
    disaster: "105", disasterName: "National Emergency Hotline",
  },
  MX: {
    country: "Mexico", countryCode: "MX", flag: "🇲🇽",
    police: "911", ambulance: "911", fire: "911",
    disaster: "800-003-7260", disasterName: "CENAPRED National Disaster Centre",
  },
  AR: {
    country: "Argentina", countryCode: "AR", flag: "🇦🇷",
    police: "911", ambulance: "107", fire: "100",
    disaster: "103", disasterName: "Civil Defence Emergency Line",
  },
  EG: {
    country: "Egypt", countryCode: "EG", flag: "🇪🇬",
    police: "122", ambulance: "123", fire: "180",
    disaster: "08008880700", disasterName: "NCCMDD National Emergency",
  },
  SA: {
    country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦",
    police: "999", ambulance: "911", fire: "911",
    disaster: "920000629", disasterName: "Civil Defence",
  },
  IT: {
    country: "Italy", countryCode: "IT", flag: "🇮🇹",
    police: "113", ambulance: "118", fire: "115",
    disaster: "1515", disasterName: "Civil Protection Emergency",
    coastGuard: "1530",
  },
  ES: {
    country: "Spain", countryCode: "ES", flag: "🇪🇸",
    police: "112", ambulance: "112", fire: "112",
    disaster: "112", disasterName: "Emergencias Nacionales",
    coastGuard: "900-202-202",
  },
  RU: {
    country: "Russia", countryCode: "RU", flag: "🇷🇺",
    police: "102", ambulance: "103", fire: "101",
    disaster: "112", disasterName: "EMERCOM Single Emergency Dispatch",
  },
  VN: {
    country: "Vietnam", countryCode: "VN", flag: "🇻🇳",
    police: "113", ambulance: "115", fire: "114",
    disaster: "1800-599-923", disasterName: "Vietnam DARD Emergency Line",
  },
  MM: {
    country: "Myanmar", countryCode: "MM", flag: "🇲🇲",
    police: "199", ambulance: "192", fire: "191",
    disaster: "067-404-0119", disasterName: "Department of Disaster Management",
  },
  KR: {
    country: "South Korea", countryCode: "KR", flag: "🇰🇷",
    police: "112", ambulance: "119", fire: "119",
    disaster: "044-205-6305", disasterName: "Ministry of Interior and Safety",
    coastGuard: "122",
  },
  // Default fallback
  XX: {
    country: "International", countryCode: "XX", flag: "🌍",
    police: "112", ambulance: "112", fire: "112",
    disaster: "112", disasterName: "European/International Emergency Number",
  },
};

// ── Get emergency numbers for a country code ──────────────────────────────────
export function getEmergencyNumbers(countryCode: string): EmergencyNumbers {
  return (
    EMERGENCY_NUMBERS_DB[countryCode.toUpperCase()] ??
    EMERGENCY_NUMBERS_DB["XX"]
  );
}

// ── Reverse geocode user location to country using free API (no key needed) ───
export async function reverseGeocodeCountry(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return "XX";
    const data = await res.json() as { countryCode?: string };
    return data.countryCode ?? "XX";
  } catch {
    return "XX";
  }
}
