// Illustrative GIS dataset for GIFT City (Gujarat International Finance Tec-City), Gandhinagar.
// Geometry is approximate and laid out over the real GIFT City area for demo purposes;
// replace with surveyed GeoJSON from the GIFT City authority for production use.

export const GIFT_CENTER = [23.1595, 72.6835];
export const GIFT_BOUNDS = [[23.1490, 72.6720], [23.1700, 72.6950]];

// Rectangle polygon from a south-west corner and size in metres.
const rect = (lat, lng, wM, hM) => {
  const dLat = hM / 111320;
  const dLng = wM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [[lat, lng], [lat + dLat, lng], [lat + dLat, lng + dLng], [lat, lng + dLng]];
};

export const STATUS = {
  operational: { label: 'Operational', color: '#10B981' },
  'under-construction': { label: 'Under Construction', color: '#F59E0B' },
  planned: { label: 'Planned', color: '#60A5FA' },
  available: { label: 'Available', color: '#A78BFA' },
  allotted: { label: 'Allotted', color: '#F472B6' },
};

export const ZONES = {
  sez: { label: 'SEZ (IFSC)', color: '#F59E0B' },
  dta: { label: 'Domestic Tariff Area', color: '#60A5FA' },
  residential: { label: 'Residential', color: '#10B981' },
  social: { label: 'Social / Institutional', color: '#A78BFA' },
  utility: { label: 'Utility', color: '#94A3B8' },
};

const doc = (name, type, date) => ({ name, type, date });

export const BUILDINGS = [
  {
    id: 'B-001', name: 'GIFT One', category: 'Commercial Office', zone: 'dta', status: 'operational',
    floors: 28, heightM: 122, builtUpSqft: 1600000, yearCompleted: 2012,
    owner: 'GIFT City Company Ltd.', occupancy: 96, plot: 'P-101',
    tenants: ['GIFT City Company Ltd.', 'Banks & Fintech firms'],
    polygon: rect(23.1601, 72.6828, 55, 55),
    documents: [doc('Occupancy Certificate', 'PDF', '2012-11-02'), doc('Fire NOC', 'PDF', '2025-03-14'), doc('Structural Audit 2025', 'PDF', '2025-08-21')],
  },
  {
    id: 'B-002', name: 'GIFT Two', category: 'Commercial Office', zone: 'dta', status: 'operational',
    floors: 28, heightM: 122, builtUpSqft: 1600000, yearCompleted: 2013,
    owner: 'GIFT City Company Ltd.', occupancy: 92, plot: 'P-102',
    tenants: ['IT/ITeS companies', 'Consulting firms'],
    polygon: rect(23.1601, 72.6840, 55, 55),
    documents: [doc('Occupancy Certificate', 'PDF', '2013-06-18'), doc('Fire NOC', 'PDF', '2025-03-14')],
  },
  {
    id: 'B-003', name: 'IFSC Exchange Tower', category: 'Stock Exchange', zone: 'sez', status: 'operational',
    floors: 18, heightM: 80, builtUpSqft: 650000, yearCompleted: 2017,
    owner: 'IFSC Exchange Holdings', occupancy: 100, plot: 'P-201',
    tenants: ['India INX', 'NSE IFSC', 'Clearing corporations'],
    polygon: rect(23.1572, 72.6862, 60, 45),
    documents: [doc('SEZ Approval', 'PDF', '2015-04-10'), doc('Occupancy Certificate', 'PDF', '2017-01-09')],
  },
  {
    id: 'B-004', name: 'IFSCA Headquarters', category: 'Regulatory / Government', zone: 'sez', status: 'under-construction',
    floors: 20, heightM: 90, builtUpSqft: 480000, yearCompleted: null, completion: 68,
    owner: 'International Financial Services Centres Authority', occupancy: 0, plot: 'P-202',
    tenants: ['IFSCA'],
    polygon: rect(23.1560, 72.6880, 70, 55),
    documents: [doc('Building Plan Approval', 'PDF', '2022-12-01'), doc('Monthly Progress Report – Oct 2026', 'PDF', '2026-10-31')],
  },
  {
    id: 'B-005', name: 'Brigade International Financial Centre', category: 'Commercial Office', zone: 'sez', status: 'operational',
    floors: 25, heightM: 105, builtUpSqft: 700000, yearCompleted: 2021,
    owner: 'Brigade Enterprises', occupancy: 84, plot: 'P-203',
    tenants: ['Global banks', 'Fund managers'],
    polygon: rect(23.1585, 72.6878, 50, 50),
    documents: [doc('Occupancy Certificate', 'PDF', '2021-09-15'), doc('Lease Register', 'XLSX', '2026-09-30')],
  },
  {
    id: 'B-006', name: 'Prestige Finance Tower', category: 'Commercial Office', zone: 'sez', status: 'under-construction',
    floors: 32, heightM: 140, builtUpSqft: 900000, yearCompleted: null, completion: 42,
    owner: 'Prestige Group', occupancy: 0, plot: 'P-204',
    tenants: [],
    polygon: rect(23.1545, 72.6860, 55, 55),
    documents: [doc('Commencement Certificate', 'PDF', '2024-05-20'), doc('Environmental Clearance', 'PDF', '2024-02-11')],
  },
  {
    id: 'B-007', name: 'GIFT Riverfront Residences – Tower A', category: 'Residential', zone: 'residential', status: 'operational',
    floors: 22, heightM: 75, builtUpSqft: 320000, yearCompleted: 2020,
    owner: 'Savvy Infrastructure', occupancy: 78, plot: 'P-301',
    tenants: ['220 residential units'],
    polygon: rect(23.1625, 72.6790, 40, 35),
    documents: [doc('RERA Registration', 'PDF', '2017-08-01'), doc('Occupancy Certificate', 'PDF', '2020-02-14')],
  },
  {
    id: 'B-008', name: 'GIFT Riverfront Residences – Tower B', category: 'Residential', zone: 'residential', status: 'under-construction',
    floors: 24, heightM: 82, builtUpSqft: 340000, yearCompleted: null, completion: 75,
    owner: 'Savvy Infrastructure', occupancy: 0, plot: 'P-301',
    tenants: [],
    polygon: rect(23.1625, 72.6800, 40, 35),
    documents: [doc('RERA Registration', 'PDF', '2021-03-11')],
  },
  {
    id: 'B-009', name: 'GIFT City Club & Convention Centre', category: 'Hospitality', zone: 'social', status: 'operational',
    floors: 4, heightM: 20, builtUpSqft: 180000, yearCompleted: 2019,
    owner: 'GIFT City Company Ltd.', occupancy: 70, plot: 'P-401',
    tenants: ['Club operator', 'Convention halls'],
    polygon: rect(23.1615, 72.6860, 80, 45),
    documents: [doc('Trade License', 'PDF', '2026-04-01')],
  },
  {
    id: 'B-010', name: 'GIFT International School', category: 'Education', zone: 'social', status: 'planned',
    floors: 5, heightM: 22, builtUpSqft: 220000, yearCompleted: null,
    owner: 'Allotment pending', occupancy: 0, plot: 'P-402',
    tenants: [],
    polygon: rect(23.1640, 72.6845, 90, 60),
    documents: [doc('Master Plan Extract', 'PDF', '2025-11-20')],
  },
  {
    id: 'B-011', name: 'Global Data Centre Campus', category: 'Data Centre', zone: 'sez', status: 'operational',
    floors: 6, heightM: 30, builtUpSqft: 400000, yearCompleted: 2018,
    owner: 'Tier-IV DC Operator', occupancy: 88, plot: 'P-205',
    tenants: ['Exchanges DR', 'Banks', 'Cloud providers'],
    polygon: rect(23.1528, 72.6895, 90, 60),
    documents: [doc('Uptime Tier-IV Certificate', 'PDF', '2024-07-07'), doc('Power Purchase Agreement', 'PDF', '2018-03-01')],
  },
  {
    id: 'B-012', name: 'Fintech Hub', category: 'Commercial Office', zone: 'dta', status: 'operational',
    floors: 12, heightM: 50, builtUpSqft: 260000, yearCompleted: 2022,
    owner: 'GIFT City Company Ltd.', occupancy: 90, plot: 'P-103',
    tenants: ['Startups', 'Incubators'],
    polygon: rect(23.1590, 72.6805, 50, 40),
    documents: [doc('Occupancy Certificate', 'PDF', '2022-06-30')],
  },
];

export const PARCELS = [
  { id: 'P-101', name: 'Plot P-101 (GIFT One)', zone: 'dta', status: 'allotted', areaSqm: 9500, far: 4.0, owner: 'GIFT City Company Ltd.', leaseYears: 99, pricePerSqm: 0, polygon: rect(23.1598, 72.6824, 70, 140) },
  { id: 'P-103', name: 'Plot P-103', zone: 'dta', status: 'allotted', areaSqm: 6000, far: 3.5, owner: 'GIFT City Company Ltd.', leaseYears: 99, pricePerSqm: 0, polygon: rect(23.1587, 72.6801, 70, 75) },
  { id: 'P-104', name: 'Plot P-104', zone: 'dta', status: 'available', areaSqm: 12000, far: 4.0, owner: 'Unallotted', leaseYears: 99, pricePerSqm: 58000, polygon: rect(23.1565, 72.6800, 120, 100) },
  { id: 'P-201', name: 'Plot P-201 (Exchange Tower)', zone: 'sez', status: 'allotted', areaSqm: 8000, far: 4.0, owner: 'IFSC Exchange Holdings', leaseYears: 99, pricePerSqm: 0, polygon: rect(23.1569, 72.6858, 80, 70) },
  { id: 'P-202', name: 'Plot P-202 (IFSCA HQ)', zone: 'sez', status: 'allotted', areaSqm: 10500, far: 3.0, owner: 'IFSCA', leaseYears: 99, pricePerSqm: 0, polygon: rect(23.1556, 72.6876, 95, 85) },
  { id: 'P-204', name: 'Plot P-204', zone: 'sez', status: 'allotted', areaSqm: 7500, far: 5.0, owner: 'Prestige Group', leaseYears: 99, pricePerSqm: 0, polygon: rect(23.1541, 72.6856, 80, 80) },
  { id: 'P-206', name: 'Plot P-206', zone: 'sez', status: 'available', areaSqm: 15000, far: 5.0, owner: 'Unallotted', leaseYears: 99, pricePerSqm: 64000, polygon: rect(23.1530, 72.6830, 130, 110) },
  { id: 'P-207', name: 'Plot P-207', zone: 'sez', status: 'available', areaSqm: 11000, far: 5.0, owner: 'Unallotted', leaseYears: 99, pricePerSqm: 62000, polygon: rect(23.1510, 72.6870, 120, 90) },
  { id: 'P-301', name: 'Plot P-301 (Riverfront Residences)', zone: 'residential', status: 'allotted', areaSqm: 14000, far: 2.7, owner: 'Savvy Infrastructure', leaseYears: 99, pricePerSqm: 0, polygon: rect(23.1620, 72.6784, 140, 100) },
  { id: 'P-302', name: 'Plot P-302', zone: 'residential', status: 'available', areaSqm: 18000, far: 2.7, owner: 'Unallotted', leaseYears: 99, pricePerSqm: 41000, polygon: rect(23.1645, 72.6780, 160, 110) },
  { id: 'P-402', name: 'Plot P-402 (School)', zone: 'social', status: 'available', areaSqm: 16000, far: 1.5, owner: 'Reserved – Education', leaseYears: 99, pricePerSqm: 22000, polygon: rect(23.1637, 72.6841, 120, 100) },
  { id: 'P-501', name: 'Plot P-501 (Hospital – reserved)', zone: 'social', status: 'planned', areaSqm: 20000, far: 2.0, owner: 'Reserved – Healthcare', leaseYears: 99, pricePerSqm: 0, polygon: rect(23.1650, 72.6880, 150, 130) },
];

export const ROADS = [
  { id: 'R-01', name: 'GIFT City Main Boulevard', widthM: 60, lanes: 6, status: 'operational', path: [[23.1500, 72.6845], [23.1560, 72.6848], [23.1620, 72.6852], [23.1690, 72.6855]] },
  { id: 'R-02', name: 'Riverfront Road', widthM: 36, lanes: 4, status: 'operational', path: [[23.1510, 72.6785], [23.1580, 72.6780], [23.1660, 72.6772], [23.1690, 72.6770]] },
  { id: 'R-03', name: 'Cross Road 1 (Exchange Avenue)', widthM: 30, lanes: 4, status: 'operational', path: [[23.1567, 72.6775], [23.1567, 72.6930]] },
  { id: 'R-04', name: 'Cross Road 2 (Tower Avenue)', widthM: 30, lanes: 4, status: 'operational', path: [[23.1612, 72.6772], [23.1612, 72.6930]] },
  { id: 'R-05', name: 'Cross Road 3', widthM: 24, lanes: 2, status: 'under-construction', path: [[23.1525, 72.6790], [23.1525, 72.6930]] },
  { id: 'R-06', name: 'Northern Link to Gandhinagar–Ahmedabad Hwy', widthM: 45, lanes: 6, status: 'planned', path: [[23.1690, 72.6855], [23.1720, 72.6900], [23.1740, 72.6960]] },
];

export const INFRASTRUCTURE = [
  { id: 'I-01', name: 'District Cooling System Plant', type: 'Cooling', status: 'operational', capacity: '180,000 TR', position: [23.1580, 72.6905] },
  { id: 'I-02', name: 'Automated Waste Collection Centre', type: 'Waste', status: 'operational', capacity: '250 TPD', position: [23.1540, 72.6915] },
  { id: 'I-03', name: 'Utility Tunnel Access Shaft – North', type: 'Utility Tunnel', status: 'operational', capacity: '16 km tunnel network', position: [23.1630, 72.6830] },
  { id: 'I-04', name: '220 kV Power Substation', type: 'Power', status: 'operational', capacity: '220 kV / 450 MVA', position: [23.1660, 72.6920] },
  { id: 'I-05', name: 'Water Treatment Plant', type: 'Water', status: 'operational', capacity: '20 MLD', position: [23.1505, 72.6800] },
  { id: 'I-06', name: 'GIFT City Metro Station', type: 'Transit', status: 'under-construction', capacity: 'Ahmedabad–Gandhinagar Metro Ph-2', position: [23.1600, 72.6870] },
  { id: 'I-07', name: 'Fire & Emergency Station', type: 'Safety', status: 'operational', capacity: '6 tenders', position: [23.1550, 72.6820] },
  { id: 'I-08', name: 'Command & Control Centre', type: 'ICT', status: 'operational', capacity: '24×7 city ops', position: [23.1595, 72.6860] },
];

// ---- Floor-level occupancy & building condition (deterministic demo data) ----
export const FLOOR_STATUS = {
  occupied: { label: 'Occupied', color: '#0F766E' },
  fitout: { label: 'Fit-out', color: '#F59E0B' },
  vacant: { label: 'Vacant', color: '#CBD5E1' },
  lobby: { label: 'Lobby / Amenities', color: '#64748B' },
  shell: { label: 'Structure Ready', color: '#93C5FD' },
  construction: { label: 'Under Construction', color: '#FDBA74' },
};

const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7);
const rng = (seed) => { let s = seed || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

const TENANT_POOL = {
  'Commercial Office': ['HDFC Bank IBU', 'Axis Bank IFSC', 'Tata Consultancy', 'Deloitte', 'Infosys Finacle', 'Kotak IFSC', 'JP Morgan Ops', 'SBI Global', 'Citi IFSC', 'KPMG', 'EY Global Delivery', 'Fintech Co-work'],
  'Stock Exchange': ['India INX Trading Floor', 'NSE IFSC', 'Clearing Corp', 'Depository Services', 'Market Surveillance'],
  'Residential': ['Residential – 10 units', 'Residential – 8 units', 'Residential – 9 units'],
  'Hospitality': ['Banquet Hall', 'Club Lounge', 'Convention Hall', 'Restaurant'],
  'Data Centre': ['Data Hall A', 'Data Hall B', 'Exchange DR', 'Cloud Pod', 'Network Room'],
  default: ['Tenant'],
};

const floorCache = {};
export function getFloors(b) {
  if (floorCache[b.id]) return floorCache[b.id];
  const r = rng(hash(b.id));
  const pool = TENANT_POOL[b.category] ?? TENANT_POOL.default;
  const areaPerFloor = Math.round(b.builtUpSqft / b.floors);
  const built = b.status === 'operational' ? b.floors : b.status === 'under-construction' ? Math.round(b.floors * (b.completion ?? 0) / 100) : 0;
  const floors = Array.from({ length: b.floors }, (_, i) => {
    let status;
    if (i >= built) status = 'construction';
    else if (b.status !== 'operational') status = 'shell';
    else if (i === 0) status = 'lobby';
    else {
      const x = r();
      status = x < b.occupancy / 100 ? 'occupied' : x < b.occupancy / 100 + 0.06 ? 'fitout' : 'vacant';
    }
    return {
      id: `${b.id}-F${i}`, level: i, label: i === 0 ? 'G' : `L${i}`, status, areaSqft: areaPerFloor,
      tenant: status === 'occupied' ? pool[Math.floor(r() * pool.length)] : status === 'fitout' ? `${pool[Math.floor(r() * pool.length)]} (moving in)` : null,
      leaseExpiry: status === 'occupied' ? `${2027 + Math.floor(r() * 8)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}` : null,
    };
  });
  return (floorCache[b.id] = floors);
}

const COMPONENTS = ['Structural', 'Facade & Glazing', 'Fire Safety', 'Lifts & Escalators', 'HVAC / Cooling', 'Electrical & Backup'];
export function getCondition(b) {
  const r = rng(hash(b.id + 'c'));
  if (b.status !== 'operational') {
    const c = b.completion ?? 0;
    return {
      mode: 'construction', score: null,
      milestones: [
        { name: 'Foundation & Basement', pct: c > 0 ? 100 : 0 },
        { name: 'Superstructure', pct: Math.min(100, Math.round(c * 1.3)) },
        { name: 'MEP Services', pct: Math.max(0, Math.round((c - 30) * 1.4)) },
        { name: 'Facade', pct: Math.max(0, Math.round((c - 45) * 1.8)) },
        { name: 'Interiors & Handover', pct: Math.max(0, Math.round((c - 70) * 3)) },
      ].map((m) => ({ ...m, pct: Math.min(100, m.pct) })),
      lastInspection: '2026-10-28', issues: c > 0 ? ['Monsoon dewatering pending sign-off'] : [],
    };
  }
  const age = 2026 - b.yearCompleted;
  const components = COMPONENTS.map((name) => ({ name, score: Math.max(55, Math.min(99, Math.round(97 - age * 1.6 - r() * 14))) }));
  const score = Math.round(components.reduce((s, c) => s + c.score, 0) / components.length);
  return {
    mode: 'operational', score, age, components,
    rating: score >= 85 ? 'Excellent' : score >= 75 ? 'Good' : score >= 65 ? 'Fair' : 'Needs Attention',
    lastInspection: `2026-${String(4 + Math.floor(r() * 6)).padStart(2, '0')}-${String(1 + Math.floor(r() * 27)).padStart(2, '0')}`,
    nextInspection: '2027-03-31',
    issues: components.filter((c) => c.score < 75).map((c) => `${c.name}: scheduled maintenance required`),
  };
}
