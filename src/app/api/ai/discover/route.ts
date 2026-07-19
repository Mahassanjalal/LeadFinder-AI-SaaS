import { NextRequest, NextResponse } from 'next/server';

interface DiscoverRequest {
  city?: string;
  state?: string;
  country?: string;
  radius?: string | number;
  industry?: string;
}

// Deterministic name generation based on seed
function seededChoice<T>(seed: number, arr: T[]): T {
  return arr[seed % arr.length];
}

function generateId(seed: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxzy0123456789';
  let result = '';
  let s = seed;
  for (let i = 0; i < 20; i++) {
    result += chars[Math.abs(s) % chars.length];
    s = Math.floor(s / chars.length) + i * 7;
    if (s === 0) s = seed + i + 1;
  }
  return result;
}

const COMPANY_PREFIXES = [
  'Apex', 'Summit', 'Catalyst', 'Horizon', 'Vertex', 'Pinnacle', 'Atlas',
  'Meridian', 'Zenith', 'Stratos', 'Nexus', 'Vanguard', 'Cobalt', 'Ember',
  'Onyx', 'Prism', 'Forge', 'Beacon', 'Crest', 'Lumen', 'Quantum', 'Nova',
  'Arc', 'Flux', 'Orion', 'Titan', 'Sterling', 'Aurora', 'Cedar', 'Granite',
];

const COMPANY_SUFFIXES = [
  'Solutions', 'Technologies', 'Group', 'Partners', 'Consulting', 'Labs',
  'Systems', 'Analytics', 'Dynamics', 'Innovations', 'Digital', 'Ventures',
  'Capital', 'Associates', 'Global', 'Networks', 'Intelligence', 'Works',
  'Services', 'Collective', 'Studios', 'Platform', 'Holdings', 'Co',
];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Real Estate', 'Manufacturing',
  'Marketing & Advertising', 'Legal Services', 'Education', 'Retail',
  'E-commerce', 'Logistics & Supply Chain', 'Insurance', 'Hospitality',
  'Construction', 'Professional Services', 'Media & Entertainment',
  'Food & Beverage', 'Automotive', 'Telecommunications', 'Pharmaceuticals',
];

const STREET_NAMES = [
  'Main St', 'Oak Ave', 'Broadway', 'Market St', 'Industrial Blvd',
  'Tech Dr', 'Commerce Way', 'Park Ave', 'Innovation Pkwy', 'Business Center Dr',
  'Enterprise Blvd', 'Summit Ave', 'River Rd', 'Lake View Dr', 'Cherry Ln',
];

const CATEGORIES = [
  'B2B Service Provider', 'Technology Company', 'Professional Services',
  'Healthcare Provider', 'Financial Services', 'Consulting Firm',
  'Manufacturing Company', 'Retail Business', 'Startup', 'Enterprise',
];

const TITLES = ['CEO', 'Founder', 'President', 'Managing Director', 'Partner', 'VP of Operations', 'Director', 'COO'];

const FIRST_NAMES = [
  'James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert',
  'Amanda', 'William', 'Jennifer', 'Thomas', 'Stephanie', 'Daniel',
  'Nicole', 'Christopher', 'Lauren', 'Matthew', 'Michelle', 'Andrew', 'Rachel',
];

const LAST_NAMES = [
  'Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore',
  'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
];

function generateBusiness(index: number, request: DiscoverRequest) {
  const seed = hashCode(JSON.stringify(request)) + index * 7919;
  const name = `${seededChoice(seed, COMPANY_PREFIXES)} ${seededChoice(seed + 1, COMPANY_SUFFIXES)}`;
  const industry = request.industry || seededChoice(seed + 2, INDUSTRIES);
  const city = request.city || 'Springfield';
  const state = request.state || 'IL';
  const country = request.country || 'US';

  const employeeCount = [5, 8, 12, 15, 20, 25, 35, 50, 75, 100, 150, 200, 350, 500, 800, 1200, 2500, 5000][(seed + 3) % 18];
  const revenueRanges = ['$500K–$1M', '$1M–$3M', '$3M–$5M', '$5M–$10M', '$10M–$25M', '$25M–$50M', '$50M–$100M', '$100M+'];
  const estimatedRevenue = revenueRanges[(seed + 4) % revenueRanges.length];
  const yearsInBusiness = 2 + ((seed + 5) % 25);
  const googleRating = parseFloat((3.5 + ((seed + 6) % 16) / 10).toFixed(1));
  const reviewCount = [0, 3, 8, 15, 25, 50, 80, 120, 200, 350, 500, 1000][(seed + 7) % 12];

  const firstName = seededChoice(seed + 8, FIRST_NAMES);
  const lastName = seededChoice(seed + 9, LAST_NAMES);
  const title = seededChoice(seed + 10, TITLES);

  const streetNum = 100 + ((seed + 11) % 9900);
  const street = seededChoice(seed + 12, STREET_NAMES);

  const postalCode = `${10000 + ((seed + 13) % 89999)}`;
  const website = `https://www.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}.com`;

  return {
    id: generateId(seed),
    companyName: name,
    industry,
    businessCategory: seededChoice(seed + 14, CATEGORIES),
    website,
    email,
    phone: `(${555 + (seed % 500)}) ${100 + ((seed + 1) % 900)}-${1000 + ((seed + 2) % 9000)}`,
    address: `${streetNum} ${street}`,
    city,
    state,
    country,
    postalCode,
    employeeCount,
    estimatedRevenue,
    yearsInBusiness,
    googleRating,
    reviewCount,
    decisionMaker: `${firstName} ${lastName}`,
    decisionMakerTitle: title,
    linkedinUrl: `https://linkedin.com/company/${domain}`,
    latitude: 30 + ((seed + 15) % 30) + ((seed + 16) % 100) / 100,
    longitude: -120 + ((seed + 17) % 80) + ((seed + 18) % 100) / 100,
    // AI fields will be populated by the scoring endpoint
    leadScore: 0,
    digitalMaturity: null,
    growthPotential: null,
    operationalComplexity: null,
    dataVolumeIndicators: null,
    marketingSophistication: null,
    confidenceScore: null,
    urgencyScore: null,
    estimatedProjectValue: null,
    businessSummary: null,
    painPoints: null,
    analyticsOpportunities: null,
    recommendedServices: null,
    aiInsights: null,
    pipelineStage: 'New',
    isFavorite: false,
    outreachStatus: 'Not Contacted',
    tags: null,
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

export async function POST(request: NextRequest) {
  try {
    const body: DiscoverRequest = await request.json();

    const count = 5 + (hashCode(JSON.stringify(body)) % 6); // 5-10 businesses
    const businesses = [];

    for (let i = 0; i < count; i++) {
      businesses.push(generateBusiness(i, body));
    }

    return NextResponse.json({
      businesses,
      meta: {
        location: `${body.city || 'Any'}, ${body.state || ''} ${body.country || 'US'}`.trim(),
        radius: body.radius ? `${body.radius} miles` : '25 miles',
        totalFound: count,
      },
    });
  } catch (error) {
    console.error('Error discovering businesses:', error);
    return NextResponse.json({ error: 'Failed to discover businesses' }, { status: 500 });
  }
}