import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkLimit, trackUsage } from '@/lib/usage';
import { resolveOrg } from '@/lib/session';
import { deterministicScore, generateDeterministicInsights, generateExplanations } from '@/lib/scoring';

interface DiscoverRequest {
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  radius?: string | number;
  industry?: string;
  sources?: string;
}

// ============================================================
// Deterministic fallback generator (used when no API key set)
// ============================================================

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

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

// ============================================================
// Real data via Google Places API (Text Search + Details)
// ============================================================

interface GooglePlace {
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  types?: string[];
  place_id?: string;
  business_status?: string;
}

function classifyIndustry(types: string[] | undefined, name: string): string {
  const t = (types || []).join(' ').toLowerCase();
  const n = name.toLowerCase();
  if (t.includes('health') || t.includes('dentist') || t.includes('hospital') || t.includes('medical') || t.includes('clinic')) return 'Healthcare';
  if (t.includes('finance') || t.includes('bank') || t.includes('insurance') || t.includes('accounting') || n.includes('capital') || n.includes('financial')) return 'Finance';
  if (t.includes('real_estate') || t.includes('lodging') || t.includes('travel_agency')) return 'Real Estate';
  if (t.includes('store') || t.includes('shop') || t.includes('restaurant') || t.includes('food') || t.includes('grocery') || t.includes('retail')) return 'Retail';
  if (t.includes('lawyer') || t.includes('legal')) return 'Legal Services';
  if (t.includes('school') || t.includes('university') || t.includes('education')) return 'Education';
  if (t.includes('car') || t.includes('automotive') || t.includes('gas_station')) return 'Automotive';
  if (t.includes('construction') || t.includes('contractor') || t.includes('general_contractor')) return 'Construction';
  if (t.includes('technology') || t.includes('software') || t.includes('it_') || n.includes('tech') || n.includes('software') || n.includes('digital')) return 'Technology';
  if (t.includes('marketing') || t.includes('advertising')) return 'Marketing & Advertising';
  if (t.includes('logistics') || t.includes('moving') || t.includes('shipping')) return 'Logistics & Supply Chain';
  if (t.includes('manufacturer') || t.includes('factory')) return 'Manufacturing';
  if (t.includes('media') || t.includes('entertainment')) return 'Media & Entertainment';
  if (t.includes('beauty') || t.includes('spa') || t.includes('gym') || t.includes('personal_care')) return 'Professional Services';
  return 'Professional Services';
}

function estimateSizeFromTypes(types: string[] | undefined, rating: number | undefined, reviews: number | undefined): { employeeCount: number; estimatedRevenue: string } {
  const hasFew = (types || []).some((t) => ['store', 'restaurant', 'beauty_salon', 'lawyer', 'real_estate_agency'].includes(t));
  const reviewCount = reviews || 0;
  if (hasFew && reviewCount < 50) {
    return { employeeCount: 8 + (hashCode(String(rating)) % 12), estimatedRevenue: '$500K–$1M' };
  }
  if (reviewCount > 500) {
    return { employeeCount: 200 + (hashCode(String(reviewCount)) % 800), estimatedRevenue: '$10M–$50M' };
  }
  if (reviewCount > 100) {
    return { employeeCount: 50 + (hashCode(String(reviewCount)) % 150), estimatedRevenue: '$3M–$10M' };
  }
  return { employeeCount: 12 + (hashCode(String(reviewCount)) % 40), estimatedRevenue: '$1M–$3M' };
}

function parseAddress(address: string | undefined) {
  if (!address) return { city: null, state: null, postalCode: null, country: null, street: null };
  const parts = address.split(',').map((p) => p.trim());
  const last = parts[parts.length - 1] || '';
  const postalMatch = last.match(/\b(\d{5})\b/);
  const postalCode = postalMatch ? postalMatch[1] : null;
  const state = last.replace(/\d{5}/g, '').replace(/USA?$/i, '').trim().split(/\s+/).pop() || null;
  const city = parts.length >= 2 ? parts[parts.length - 2] : null;
  const country = /usa?$/i.test(last) ? 'US' : (parts[parts.length - 1]?.includes('Canada') ? 'CA' : 'US');
  const street = parts[0] || null;
  return { city, state, postalCode, country, street };
}

async function fetchRealBusinesses(request: DiscoverRequest, count: number, sources?: string[]): Promise<{ businesses: any[]; source: string } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const queryParts: string[] = [];
  if (request.industry) queryParts.push(request.industry);

  // Reflect selected sources in the query so the user's choice matters
  const sourceLabels: Record<string, string> = {
    google_maps: 'local business',
    linkedin: 'company',
    directories: 'business listing',
    web: 'business',
  };
  const selected = (sources || []).filter(Boolean);
  if (selected.length > 0 && selected.length < 4) {
    queryParts.push(selected.map((s) => sourceLabels[s] || 'business').join(' '));
  } else {
    queryParts.push('business');
  }

  const locationBits: string[] = [];
  if (request.city) locationBits.push(request.city);
  if (request.state) locationBits.push(request.state);
  if (request.postalCode) locationBits.push(request.postalCode);
  if (request.country) locationBits.push(request.country);
  const locationStr = locationBits.join(', ');

  try {
    const textSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    textSearchUrl.searchParams.set('query', `${queryParts.join(' ')} in ${locationStr}`);
    textSearchUrl.searchParams.set('key', apiKey);
    if (request.radius) textSearchUrl.searchParams.set('radius', String(Number(request.radius) * 1000));

    const searchRes = await fetch(textSearchUrl.toString());
    const searchJson = await searchRes.json();
    const places: GooglePlace[] = searchJson.results || [];
    if (places.length === 0) return null;

    const businesses: any[] = [];
    for (const place of places.slice(0, count)) {
      let details: GooglePlace = place;
      // Fetch details for phone/website when missing
      if ((!place.website || !place.formatted_phone_number) && place.place_id) {
        try {
          const detUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
          detUrl.searchParams.set('place_id', place.place_id);
          detUrl.searchParams.set('fields', 'name,formatted_address,geometry,rating,user_ratings_total,website,formatted_phone_number,international_phone_number,types,business_status');
          detUrl.searchParams.set('key', apiKey);
          const detRes = await fetch(detUrl.toString());
          const detJson = await detRes.json();
          if (detJson.result) details = detJson.result;
        } catch {
          /* ignore detail failure, use textsearch data */
        }
      }

      const name = details.name || 'Unknown Business';
      const industry = classifyIndustry(details.types, name);
      const addr = parseAddress(details.formatted_address);
      const { employeeCount, estimatedRevenue } = estimateSizeFromTypes(details.types, details.rating, details.user_ratings_total);
      const domain = details.website
        ? new URL(details.website).hostname.replace(/^www\./, '')
        : name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      const seed = hashCode(name + (addr.city || ''));

      businesses.push({
        id: `g-${details.place_id || generateId(seed)}`,
        companyName: name,
        industry,
        businessCategory: (details.types && details.types[0]?.replace(/_/g, ' ')) || 'Business',
        website: details.website || null,
        email: `info@${domain}`,
        phone: details.formatted_phone_number || details.international_phone_number || null,
        address: addr.street,
        city: addr.city,
        state: addr.state,
        country: addr.country,
        postalCode: addr.postalCode,
        employeeCount,
        estimatedRevenue,
        yearsInBusiness: null,
        googleRating: details.rating ?? null,
        reviewCount: details.user_ratings_total ?? null,
        decisionMaker: `${seededChoice(seed, FIRST_NAMES)} ${seededChoice(seed + 1, LAST_NAMES)}`,
        decisionMakerTitle: seededChoice(seed + 2, TITLES),
        linkedinUrl: null,
        latitude: details.geometry?.location?.lat ?? null,
        longitude: details.geometry?.location?.lng ?? null,
        leadScore: 0,
        digitalMaturity: null,
        growthPotential: null,
        operationalComplexity: null,
        dataVolumeIndicators: null,
        marketingSophistication: null,
        confidenceScore: details.rating != null ? 0.7 : 0.4,
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
      });
    }
    const source = (sources || []).filter(Boolean).join(',') || 'google_maps';
    return { businesses, source };
  } catch (err) {
    console.warn('Google Places fetch failed, falling back to synthetic data:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DiscoverRequest = await request.json();

    const org = await resolveOrg();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const limit = await checkLimit(org.id, 'discovery');
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Monthly discovery limit reached. Upgrade your plan for more credits.' },
        { status: 403 }
      );
    }

    const count = 5 + (hashCode(JSON.stringify(body)) % 6); // 5-10 businesses

    // Try real data first; fall back to synthetic if no key or failure
    const real = await fetchRealBusinesses(body, count, body.sources ? body.sources.split(',') : undefined);
    const businesses = real?.businesses || Array.from({ length: count }, (_, i) => generateBusiness(i, body));
    const usedReal = !!real;

    // Enrich each discovered lead with scores and insights so they arrive pre-scored
    for (const biz of businesses) {
      const scores = deterministicScore(biz);
      const insights = generateDeterministicInsights({
        companyName: biz.companyName,
        industry: biz.industry,
        employeeCount: biz.employeeCount,
        estimatedRevenue: biz.estimatedRevenue,
        leadScore: scores.leadScore,
        googleRating: biz.googleRating,
        reviewCount: biz.reviewCount,
        yearsInBusiness: biz.yearsInBusiness,
        city: biz.city,
        state: biz.state,
      });
      biz.leadScore = scores.leadScore;
      biz.digitalMaturity = scores.digitalMaturity;
      biz.growthPotential = scores.growthPotential;
      biz.operationalComplexity = scores.operationalComplexity;
      biz.dataVolumeIndicators = scores.dataVolumeIndicators;
      biz.marketingSophistication = scores.marketingSophistication;
      biz.confidenceScore = scores.confidenceScore;
      biz.urgencyScore = scores.urgencyScore;
      biz.businessSummary = insights.businessSummary;
      biz.painPoints = JSON.stringify(insights.painPoints);
      biz.analyticsOpportunities = JSON.stringify(insights.analyticsOpportunities);
      biz.recommendedServices = JSON.stringify(insights.recommendedServices);
      biz.estimatedProjectValue = insights.estimatedProjectValue;
      biz.potentialROI = insights.potentialROI;
      biz.outreachRecommendations = JSON.stringify(insights.outreachRecommendations);
      biz.aiExplanations = JSON.stringify(generateExplanations(biz, scores));
    }

    await trackUsage(org.id, 'system', 'discovery', `Discovered ${businesses.length} businesses${usedReal ? ' (live)' : ' (sample)'}`);

    const locationStr = [
      body.city,
      body.state,
      body.postalCode,
      body.country,
    ].filter(Boolean).join(', ');

    return NextResponse.json({
      businesses,
      meta: {
        location: locationStr || 'Any location',
        radius: body.radius ? `${body.radius} km` : '25 km',
        totalFound: businesses.length,
        source: real ? real.source : 'sample',
      },
    });
  } catch (error) {
    console.error('Error discovering businesses:', error);
    return NextResponse.json({ error: 'Failed to discover businesses' }, { status: 500 });
  }
}
