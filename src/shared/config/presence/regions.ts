export interface Region {
  id: string;
  name: string;
  nameKo: string;
  country: string;
  countryCode: string;
  timezone: string;
  /** [startHourLocal, endHourLocal] inclusive — local-time prime window */
  activeHours: [number, number];
  /** Multiplier applied when in prime window (1.0 baseline) */
  activityMultiplier: number;
  /** Mission category trend bias 0..1 (higher = more trending) */
  missionTrendBias: number;
  /** Onboarding wave amplitude 0..1 */
  onboardingWaveStrength: number;
}

export const REGIONS: Region[] = [
  { id: "seoul",     name: "Seoul",       nameKo: "서울",       country: "South Korea", countryCode: "KR", timezone: "Asia/Seoul",      activeHours: [19, 24], activityMultiplier: 1.35, missionTrendBias: 0.85, onboardingWaveStrength: 0.95 },
  { id: "tokyo",     name: "Tokyo",       nameKo: "도쿄",       country: "Japan",       countryCode: "JP", timezone: "Asia/Tokyo",      activeHours: [20, 24], activityMultiplier: 1.25, missionTrendBias: 0.75, onboardingWaveStrength: 0.80 },
  { id: "singapore", name: "Singapore",   nameKo: "싱가포르",   country: "Singapore",   countryCode: "SG", timezone: "Asia/Singapore",  activeHours: [19, 23], activityMultiplier: 1.15, missionTrendBias: 0.70, onboardingWaveStrength: 0.65 },
  { id: "bangkok",   name: "Bangkok",     nameKo: "방콕",       country: "Thailand",    countryCode: "TH", timezone: "Asia/Bangkok",    activeHours: [19, 23], activityMultiplier: 1.10, missionTrendBias: 0.60, onboardingWaveStrength: 0.60 },
  { id: "dubai",     name: "Dubai",       nameKo: "두바이",     country: "UAE",         countryCode: "AE", timezone: "Asia/Dubai",      activeHours: [20, 24], activityMultiplier: 1.05, missionTrendBias: 0.55, onboardingWaveStrength: 0.55 },
  { id: "berlin",    name: "Berlin",      nameKo: "베를린",     country: "Germany",     countryCode: "DE", timezone: "Europe/Berlin",   activeHours: [12, 14], activityMultiplier: 1.10, missionTrendBias: 0.60, onboardingWaveStrength: 0.55 },
  { id: "london",    name: "London",      nameKo: "런던",       country: "UK",          countryCode: "GB", timezone: "Europe/London",   activeHours: [12, 14], activityMultiplier: 1.20, missionTrendBias: 0.70, onboardingWaveStrength: 0.65 },
  { id: "newyork",   name: "New York",    nameKo: "뉴욕",       country: "USA",         countryCode: "US", timezone: "America/New_York", activeHours: [19, 23], activityMultiplier: 1.30, missionTrendBias: 0.80, onboardingWaveStrength: 0.80 },
  { id: "la",        name: "Los Angeles", nameKo: "로스앤젤레스", country: "USA",       countryCode: "US", timezone: "America/Los_Angeles", activeHours: [19, 23], activityMultiplier: 1.20, missionTrendBias: 0.75, onboardingWaveStrength: 0.70 },
  { id: "saopaulo",  name: "São Paulo",   nameKo: "상파울루",   country: "Brazil",      countryCode: "BR", timezone: "America/Sao_Paulo", activeHours: [19, 23], activityMultiplier: 1.10, missionTrendBias: 0.55, onboardingWaveStrength: 0.55 },
];

export const COUNTRY_COUNT = new Set(REGIONS.map((r) => r.countryCode)).size + 32; // realistic global spread
