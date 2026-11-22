import type { AqiSnapshot, CommunityAggregate, ForecastHour, UserProfile } from './schemas';

function buildForecast48h(baseAqi: number, basePm25: number, severeInversion: boolean): ForecastHour[] {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const hours: ForecastHour[] = [];

  for (let i = 0; i < 48; i++) {
    const dt = new Date(now.getTime() + i * 3600 * 1000);
    const h = dt.getHours();
    // Diurnal winter smog curve: peaks 6-10 AM and 8-11 PM, cleanest 2-6 PM
    let factor = 1.0;
    let blh = severeInversion ? 340 : 950;
    let wind = severeInversion ? 5.2 : 11.4;

    if (h >= 6 && h <= 10) {
      factor = severeInversion ? 1.16 : 1.24;
      blh = severeInversion ? 160 : 480;
      wind = severeInversion ? 3.2 : 7.5;
    } else if (h >= 14 && h <= 18) {
      factor = severeInversion ? 0.78 : 0.74;
      blh = severeInversion ? 680 : 1450;
      wind = severeInversion ? 8.8 : 15.2;
    } else if (h >= 20 || h <= 2) {
      factor = severeInversion ? 1.12 : 1.15;
      blh = severeInversion ? 190 : 540;
      wind = severeInversion ? 3.8 : 8.2;
    }

    const aqi = Math.min(500, Math.max(25, Math.round(baseAqi * factor)));
    const pm25 = Math.max(8, Math.round(basePm25 * factor));
    const pm10 = Math.round(pm25 * 1.65);
    const inversionRisk: ForecastHour['inversionRisk'] =
      blh < 300 ? 'high' : blh < 700 ? 'moderate' : 'low';

    const label =
      i === 0
        ? 'Now'
        : dt.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }).replace(' ', '');

    hours.push({
      isoTime: dt.toISOString(),
      hourLabel: label,
      aqi,
      pm25,
      pm10,
      windKmh: Math.round(wind * 10) / 10,
      boundaryLayerM: blh,
      inversionRisk,
    });
  }

  return hours;
}

export interface DemoScenario {
  key: 'coimbatore' | 'delhi';
  label: string;
  tagline: string;
  profile: UserProfile;
  aqiSnapshot: AqiSnapshot;
  community: CommunityAggregate;
}

export const DEMO_SCENARIOS: Record<'coimbatore' | 'delhi', DemoScenario> = {
  coimbatore: {
    key: 'coimbatore',
    label: 'Coimbatore (Moderate · AQI 85)',
    tagline: 'Working couple with car, child & elder · Moderate budget',
    profile: {
      id: 'demo-coimbatore',
      displayName: 'Harikrishna',
      city: 'Coimbatore',
      region: 'Tamil Nadu, India',
      approxLat: 11.02,
      approxLng: 76.96,
      language: 'en',
      household: [
        { id: 'm1', label: 'You', role: 'adult', conditions: ['none'] },
        { id: 'm2', label: 'Child', role: 'child', conditions: ['asthma'] },
        { id: 'm3', label: 'Elder', role: 'elder', conditions: ['none'] },
      ],
      homeType: 'apartment_2bhk',
      roomAreaM2: 80,
      commuteMode: 'private_car',
      carTripsPerWeek: 5,
      publicTransitPct: 30,
      cookingFuel: 'lpg',
      heatingType: 'none',
      hasPurifier: false,
      budget: 'moderate',
      eli10Mode: false,
      elderMode: false,
      alertsOptIn: true,
      scenarioKey: 'coimbatore',
    },
    aqiSnapshot: {
      city: 'Coimbatore',
      region: 'Tamil Nadu, India',
      approxLat: 11.02,
      approxLng: 76.96,
      updatedAt: new Date().toISOString(),
      source: 'Demo Mode (CPCB + Open-Meteo Profile)',
      temperatureC: 28,
      condition: 'Partly Cloudy',
      aqi: 85,
      band: 'Moderate',
      dominantPollutant: 'PM2.5',
      pm25: 28,
      pm10: 54,
      no2: 19,
      o3: 38,
      windKmh: 12.4,
      boundaryLayerM: 1120,
      inversionActive: false,
      bestWindow: '5:00 PM – 7:00 PM',
      worstWindow: '9:00 AM – 11:00 AM',
      forecast48h: buildForecast48h(85, 28, false),
    },
    community: {
      city: 'Coimbatore',
      goalText: 'Our Goal: 10% lower PM2.5 this month',
      goalProgressPct: 78,
      participants: 24500,
      co2eAvoidedTonnes: 12.8,
      cleanerAirHoursMillions: 2.1,
      neighborhoodGroups: [
        { id: 'g1', name: 'GreenSteps Coimbatore', co2eTonnes: 12.8, households: 1840 },
        { id: 'g2', name: 'RS Puram AirNest Champs', co2eTonnes: 11.4, households: 1620 },
        { id: 'g3', name: 'Peelamedu CleanAir Squad', co2eTonnes: 10.9, households: 1510 },
      ],
    },
  },
  delhi: {
    key: 'delhi',
    label: 'Delhi-NCR (Severe · AQI 420)',
    tagline: 'Winter smog emergency · Asthmatic child + elder · Low budget',
    profile: {
      id: 'demo-delhi',
      displayName: 'Aarav',
      city: 'New Delhi',
      region: 'Delhi-NCR, India',
      approxLat: 28.61,
      approxLng: 77.21,
      language: 'en',
      household: [
        { id: 'd1', label: 'You', role: 'adult', conditions: ['none'] },
        { id: 'd2', label: 'Child (Asthma)', role: 'child', conditions: ['asthma'] },
        { id: 'd3', label: 'Elder', role: 'elder', conditions: ['heart_condition'] },
      ],
      homeType: 'apartment_2bhk',
      roomAreaM2: 55,
      commuteMode: 'public_transit',
      carTripsPerWeek: 0,
      publicTransitPct: 85,
      cookingFuel: 'lpg',
      heatingType: 'none',
      hasPurifier: false,
      budget: 'low',
      eli10Mode: false,
      elderMode: false,
      alertsOptIn: true,
      scenarioKey: 'delhi',
    },
    aqiSnapshot: {
      city: 'New Delhi',
      region: 'Delhi-NCR, India',
      approxLat: 28.61,
      approxLng: 77.21,
      updatedAt: new Date().toISOString(),
      source: 'Demo Mode (GRAP Stage IV Winter Smog Profile)',
      temperatureC: 14,
      condition: 'Dense Winter Smog',
      aqi: 420,
      band: 'Severe',
      dominantPollutant: 'PM2.5',
      pm25: 278,
      pm10: 412,
      no2: 68,
      o3: 24,
      windKmh: 3.4,
      boundaryLayerM: 185,
      inversionActive: true,
      bestWindow: '2:00 PM – 4:00 PM',
      worstWindow: '6:30 AM – 10:30 AM',
      forecast48h: buildForecast48h(420, 278, true),
    },
    community: {
      city: 'Delhi-NCR',
      goalText: 'Our Goal: Zero Waste Burning & 15% Fewer Car Trips',
      goalProgressPct: 64,
      participants: 68400,
      co2eAvoidedTonnes: 41.6,
      cleanerAirHoursMillions: 6.4,
      neighborhoodGroups: [
        { id: 'dg1', name: 'Dwarka Clean Air RWA', co2eTonnes: 16.4, households: 3200 },
        { id: 'dg2', name: 'Rohini Metro Commuters', co2eTonnes: 13.8, households: 2740 },
        { id: 'dg3', name: 'South Delhi Zero-Burn Circle', co2eTonnes: 11.4, households: 2150 },
      ],
    },
  },
};

export const INDIAN_AND_GLOBAL_CITIES = [
  { city: 'Coimbatore', region: 'Tamil Nadu, India', lat: 11.02, lng: 76.96 },
  { city: 'New Delhi', region: 'Delhi-NCR, India', lat: 28.61, lng: 77.21 },
  { city: 'Chennai', region: 'Tamil Nadu, India', lat: 13.08, lng: 80.27 },
  { city: 'Bengaluru', region: 'Karnataka, India', lat: 12.97, lng: 77.59 },
  { city: 'Mumbai', region: 'Maharashtra, India', lat: 19.08, lng: 72.88 },
  { city: 'Gurugram', region: 'Haryana, India', lat: 28.46, lng: 77.03 },
  { city: 'Noida', region: 'Uttar Pradesh, India', lat: 28.54, lng: 77.39 },
  { city: 'Kolkata', region: 'West Bengal, India', lat: 22.57, lng: 88.36 },
  { city: 'Lahore', region: 'Punjab, Pakistan', lat: 31.55, lng: 74.35 },
  { city: 'London', region: 'United Kingdom', lat: 51.51, lng: -0.13 },
  { city: 'San Francisco', region: 'California, USA', lat: 37.77, lng: -122.42 },
];
