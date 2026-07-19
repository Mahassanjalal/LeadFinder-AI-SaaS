import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatCompletion, parseAIJson } from '@/lib/ai-client';

// ====== Deterministic fallback scoring algorithm ======

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseRevenue(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  const lower = value.toLowerCase();
  if (lower.includes('billion') || lower.includes('b')) return num * 1_000_000_000;
  if (lower.includes('million') || lower.includes('m')) return num * 1_000_000;
  if (lower.includes('thousand') || lower.includes('k')) return num * 1_000;
  return num;
}

const HIGH_FIT_INDUSTRIES = [
  'technology', 'tech', 'software', 'saas', 'fintech', 'healthcare',
  'finance', 'financial', 'e-commerce', 'ecommerce', 'retail',
  'marketing', 'advertising', 'insurance', 'realestate', 'real estate',
  'manufacturing', 'logistics', 'education', 'media',
];

function industryFitScore(industry: string | null | undefined): number {
  if (!industry) return 50;
  const lower = industry.toLowerCase();
  for (const fit of HIGH_FIT_INDUSTRIES) {
    if (lower.includes(fit)) return 80 + (hashCode(lower) % 20);
  }
  const mediumFit = ['consulting', 'legal', 'professional', 'hospitality', 'food', 'restaurant'];
  for (const fit of mediumFit) {
    if (lower.includes(fit)) return 55 + (hashCode(lower) % 20);
  }
  return 40 + (hashCode(lower) % 20);
}

function deterministicScore(lead: Record<string, unknown>) {
  const companyName = (lead.companyName || lead.company_name || '') as string;
  const industry = (lead.industry || '') as string;
  const employeeCount = parseInt(String(lead.employeeCount ?? lead.employee_count ?? '0'), 10) || 0;
  const revenueStr = (lead.estimatedRevenue || lead.revenue || '') as string;
  const revenue = parseRevenue(revenueStr);
  const googleRating = parseFloat(String(lead.googleRating ?? lead.google_rating ?? '0')) || 0;
  const reviewCount = parseInt(String(lead.reviewCount ?? lead.review_count ?? '0'), 10) || 0;
  const yearsInBusiness = parseInt(String(lead.yearsInBusiness ?? lead.years_in_business ?? '0'), 10) || 0;
  const hasWebsite = !!(lead.website);
  const hasLinkedin = !!(lead.linkedinUrl || lead.linkedin_url);
  const hasEmail = !!(lead.email);
  const hasPhone = !!(lead.phone);
  const indLower = industry.toLowerCase();

  // Digital Maturity
  let digitalMaturity = 30;
  if (hasWebsite) digitalMaturity += 20;
  if (hasLinkedin) digitalMaturity += 15;
  if (hasEmail) digitalMaturity += 10;
  if (hasPhone) digitalMaturity += 5;
  if (googleRating > 0) digitalMaturity += Math.min(10, Math.round(googleRating * 2));
  if (reviewCount > 100) digitalMaturity += 10;
  else if (reviewCount > 50) digitalMaturity += 7;
  else if (reviewCount > 10) digitalMaturity += 5;
  if (yearsInBusiness > 10) digitalMaturity += 5;
  digitalMaturity += (hashCode(companyName) % 5);
  digitalMaturity = clamp(digitalMaturity, 0, 100);

  // Growth Potential
  let growthPotential = 30;
  if (revenue > 50_000_000) growthPotential += 25;
  else if (revenue > 10_000_000) growthPotential += 20;
  else if (revenue > 1_000_000) growthPotential += 15;
  else if (revenue > 100_000) growthPotential += 8;
  if (employeeCount > 500) growthPotential += 20;
  else if (employeeCount > 100) growthPotential += 15;
  else if (employeeCount > 50) growthPotential += 10;
  else if (employeeCount > 10) growthPotential += 5;
  if (yearsInBusiness > 0 && yearsInBusiness <= 3) growthPotential += 15;
  else if (yearsInBusiness <= 7) growthPotential += 10;
  else if (yearsInBusiness > 15) growthPotential -= 5;
  growthPotential += Math.round((industryFitScore(industry) - 50) * 0.3);
  growthPotential += (hashCode(companyName + 'growth') % 5);
  growthPotential = clamp(growthPotential, 0, 100);

  // Operational Complexity
  let operationalComplexity = 20;
  if (employeeCount > 1000) operationalComplexity += 30;
  else if (employeeCount > 500) operationalComplexity += 25;
  else if (employeeCount > 100) operationalComplexity += 18;
  else if (employeeCount > 50) operationalComplexity += 12;
  else if (employeeCount > 10) operationalComplexity += 5;
  if (revenue > 100_000_000) operationalComplexity += 20;
  else if (revenue > 10_000_000) operationalComplexity += 15;
  else if (revenue > 1_000_000) operationalComplexity += 10;
  if (yearsInBusiness > 10) operationalComplexity += 10;
  else if (yearsInBusiness > 5) operationalComplexity += 5;
  const complexIndustries = ['manufacturing', 'healthcare', 'finance', 'logistics', 'insurance'];
  if (complexIndustries.some(ci => indLower.includes(ci))) operationalComplexity += 10;
  operationalComplexity += (hashCode(companyName + 'ops') % 5);
  operationalComplexity = clamp(operationalComplexity, 0, 100);

  // Data Volume Indicators
  let dataVolume = 15;
  if (employeeCount > 1000) dataVolume += 30;
  else if (employeeCount > 500) dataVolume += 25;
  else if (employeeCount > 100) dataVolume += 15;
  else if (employeeCount > 50) dataVolume += 8;
  if (revenue > 50_000_000) dataVolume += 20;
  else if (revenue > 10_000_000) dataVolume += 15;
  else if (revenue > 1_000_000) dataVolume += 8;
  if (reviewCount > 500) dataVolume += 15;
  else if (reviewCount > 100) dataVolume += 10;
  else if (reviewCount > 20) dataVolume += 5;
  if (['technology', 'finance', 'healthcare', 'e-commerce', 'retail', 'software'].some(i => indLower.includes(i))) {
    dataVolume += 10;
  }
  dataVolume += (hashCode(companyName + 'data') % 5);
  dataVolume = clamp(dataVolume, 0, 100);

  // Marketing Sophistication
  let marketingSophistication = 20;
  if (hasWebsite) marketingSophistication += 15;
  if (hasLinkedin) marketingSophistication += 15;
  if (googleRating > 4) marketingSophistication += 15;
  else if (googleRating > 3) marketingSophistication += 10;
  else if (googleRating > 0) marketingSophistication += 5;
  if (reviewCount > 200) marketingSophistication += 15;
  else if (reviewCount > 50) marketingSophistication += 10;
  else if (reviewCount > 10) marketingSophistication += 5;
  if (indLower.includes('marketing') || indLower.includes('advertising') || indLower.includes('media')) {
    marketingSophistication += 15;
  }
  if (indLower.includes('e-commerce') || indLower.includes('ecommerce')) {
    marketingSophistication += 10;
  }
  marketingSophistication += (hashCode(companyName + 'mktg') % 5);
  marketingSophistication = clamp(marketingSophistication, 0, 100);

  // Confidence Score
  let dataPoints = 0;
  const totalPossible = 8;
  if (employeeCount > 0) dataPoints++;
  if (revenue > 0) dataPoints++;
  if (industry) dataPoints++;
  if (googleRating > 0) dataPoints++;
  if (reviewCount > 0) dataPoints++;
  if (yearsInBusiness > 0) dataPoints++;
  if (hasWebsite) dataPoints++;
  if (hasEmail) dataPoints++;
  const confidenceScore = parseFloat((dataPoints / totalPossible).toFixed(2));

  // Urgency Score
  let urgencyScore = 20;
  if (employeeCount > 50 && employeeCount <= 200 && yearsInBusiness <= 5) urgencyScore += 25;
  if (revenue > 5_000_000 && digitalMaturity < 50) urgencyScore += 20;
  if (googleRating > 0 && googleRating < 3.5) urgencyScore += 15;
  if (dataVolume > 60 && digitalMaturity < 50) urgencyScore += 15;
  if (indLower.includes('tech') || indLower.includes('software') || indLower.includes('saas')) {
    if (employeeCount > 20 && employeeCount < 500) urgencyScore += 10;
  }
  urgencyScore += (hashCode(companyName + 'urgency') % 6);
  urgencyScore = clamp(urgencyScore, 0, 100);

  // Overall Lead Score
  const leadScore = clamp(
    Math.round(
      digitalMaturity * 0.10 +
      growthPotential * 0.25 +
      operationalComplexity * 0.15 +
      dataVolume * 0.20 +
      marketingSophistication * 0.10 +
      industryFitScore(industry) * 0.10 +
      urgencyScore * 0.10
    ),
    0,
    100
  );

  return {
    leadScore,
    digitalMaturity,
    growthPotential,
    operationalComplexity,
    dataVolumeIndicators: dataVolume,
    marketingSophistication,
    confidenceScore,
    urgencyScore,
  };
}

// ====== AI Scoring ======

const SCORE_SYSTEM_PROMPT = `You are an expert lead scoring AI for data analytics services. Analyze the given business and return ONLY valid JSON (no markdown, no code blocks) with these fields:
{
  "leadScore": <number 0-100>,
  "digitalMaturity": <number 0-100>,
  "growthPotential": <number 0-100>,
  "operationalComplexity": <number 0-100>,
  "dataVolumeIndicators": <number 0-100>,
  "marketingSophistication": <number 0-100>,
  "confidenceScore": <number 0.0-1.0>,
  "urgencyScore": <number 0-100>
}

Scoring criteria:
- leadScore: Overall likelihood they need data analytics (higher for tech, finance, healthcare; larger companies; growing businesses)
- digitalMaturity: How digitally mature they appear (website quality, tech stack hints, online presence)
- growthPotential: Growth signals (hiring activity, expansion, funding, market position)
- operationalComplexity: How complex their operations likely are (more employees/locations = higher)
- dataVolumeIndicators: How much data they likely generate (customer transactions, inventory, multi-channel)
- marketingSophistication: How sophisticated their marketing appears (SEO, social media, content)
- confidenceScore: How confident you are in this assessment (0.0-1.0)
- urgencyScore: How urgently they might need analytics help (0-100)`;

export async function POST(request: NextRequest) {
  try {
    const lead = await request.json();

    const companyName = lead.companyName || lead.company_name || '';
    const industry = lead.industry || '';
    const city = lead.city || '';
    const state = lead.state || '';
    const employeeCount = lead.employeeCount || '';
    const estimatedRevenue = lead.estimatedRevenue || '';
    const companySize = lead.companySize || '';
    const googleRating = lead.googleRating ?? '';
    const reviewCount = lead.reviewCount ?? '';
    const yearsInBusiness = lead.yearsInBusiness ?? '';
    const businessCategory = lead.businessCategory || '';
    const website = lead.website || '';
    const leadId = lead.id;

    // Build a business description for the AI
    const userPrompt = `Analyze this business and score it:
- Company: ${companyName}
- Industry: ${industry}
- Location: ${city}, ${state}
- Company Size: ${companySize} (${employeeCount} employees)
- Estimated Revenue: ${estimatedRevenue}
- Google Rating: ${googleRating}/5 (${reviewCount} reviews)
- Years in Business: ${yearsInBusiness}
- Business Category: ${businessCategory}
- Website: ${website}`;

    let scores: {
      leadScore: number;
      digitalMaturity: number;
      growthPotential: number;
      operationalComplexity: number;
      dataVolumeIndicators: number;
      marketingSophistication: number;
      confidenceScore: number;
      urgencyScore: number;
    };

    // Try AI scoring first
    try {
      const aiResponse = await chatCompletion(SCORE_SYSTEM_PROMPT, userPrompt);
      const parsed = parseAIJson<{
        leadScore: number;
        digitalMaturity: number;
        growthPotential: number;
        operationalComplexity: number;
        dataVolumeIndicators: number;
        marketingSophistication: number;
        confidenceScore: number;
        urgencyScore: number;
      }>(aiResponse);

      if (parsed && typeof parsed.leadScore === 'number') {
        // Validate and clamp AI scores
        scores = {
          leadScore: clamp(parsed.leadScore, 0, 100),
          digitalMaturity: clamp(parsed.digitalMaturity ?? 0, 0, 100),
          growthPotential: clamp(parsed.growthPotential ?? 0, 0, 100),
          operationalComplexity: clamp(parsed.operationalComplexity ?? 0, 0, 100),
          dataVolumeIndicators: clamp(parsed.dataVolumeIndicators ?? 0, 0, 100),
          marketingSophistication: clamp(parsed.marketingSophistication ?? 0, 0, 100),
          confidenceScore: Math.min(1.0, Math.max(0.0, parseFloat(String(parsed.confidenceScore ?? 0.5)))),
          urgencyScore: clamp(parsed.urgencyScore ?? 0, 0, 100),
        };
      } else {
        throw new Error('AI returned invalid or missing leadScore');
      }
    } catch (aiError) {
      console.warn('AI scoring failed, falling back to deterministic algorithm:', aiError);
      scores = deterministicScore(lead) as typeof scores;
    }

    // Update the lead in the database if we have an ID
    if (leadId) {
      try {
        await db.lead.update({
          where: { id: leadId },
          data: {
            leadScore: scores.leadScore,
            digitalMaturity: scores.digitalMaturity,
            growthPotential: scores.growthPotential,
            operationalComplexity: scores.operationalComplexity,
            dataVolumeIndicators: scores.dataVolumeIndicators,
            marketingSophistication: scores.marketingSophistication,
            confidenceScore: scores.confidenceScore,
            urgencyScore: scores.urgencyScore,
          },
        });
      } catch (dbError) {
        console.warn('Failed to update lead in database:', dbError);
      }
    }

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error computing AI score:', error);
    return NextResponse.json({ error: 'Failed to compute score' }, { status: 500 });
  }
}