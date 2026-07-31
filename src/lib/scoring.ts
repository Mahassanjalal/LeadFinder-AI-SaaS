// Shared deterministic scoring, insights, and explanations library.
// Used by: ai/score, ai/insights, ai/discover routes and reseed-with-ai script.

// ====== Utility helpers ======

export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

export function clamp(value: number, min: number, max: number): number {
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

// ====== Deterministic lead scoring ======

export interface Scores {
  leadScore: number;
  digitalMaturity: number;
  growthPotential: number;
  operationalComplexity: number;
  dataVolumeIndicators: number;
  marketingSophistication: number;
  confidenceScore: number;
  urgencyScore: number;
}

export function deterministicScore(lead: Record<string, unknown>): Scores {
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

// ====== Deterministic insights ======

export interface Insights {
  businessSummary: string;
  painPoints: string[];
  analyticsOpportunities: string[];
  recommendedServices: string[];
  estimatedProjectValue: string;
  potentialROI: string;
  outreachRecommendations: string[];
}

export function generateDeterministicInsights(lead: {
  companyName: string;
  industry: string;
  employeeCount: number | null;
  estimatedRevenue: string | null;
  leadScore: number;
  googleRating: number | null;
  reviewCount: number | null;
  yearsInBusiness: number | null;
  city: string | null;
  state: string | null;
}): Insights {
  const { companyName, industry, employeeCount, estimatedRevenue, leadScore, googleRating, reviewCount, yearsInBusiness, city, state } = lead;
  const locationStr = city ? `${city}${state ? `, ${state}` : ''}` : '';
  const sizeStr = employeeCount ? `${employeeCount} employees` : '';

  const businessSummary = `${companyName} is a ${industry} company${locationStr ? ` based in ${locationStr}` : ''}${sizeStr ? ` with approximately ${sizeStr}` : ''}${yearsInBusiness ? `, established ${yearsInBusiness} years ago` : ''}. ${estimatedRevenue ? `With estimated revenue of ${estimatedRevenue},` : ''} they represent a ${leadScore >= 70 ? 'strong' : leadScore >= 50 ? 'moderate' : 'developing'} opportunity for data analytics services.`;

  const indLower = industry.toLowerCase();
  let painPoints: string[] = [];
  if (indLower.includes('health')) {
    painPoints = ['Patient flow and scheduling optimization', 'Claims processing bottlenecks', 'Regulatory compliance reporting overhead', 'Staff utilization tracking'];
  } else if (indLower.includes('financ') || indLower.includes('bank') || indLower.includes('insurance')) {
    painPoints = ['Risk assessment and fraud detection', 'Customer lifetime value modeling', 'Regulatory reporting complexity', 'Portfolio performance tracking'];
  } else if (indLower.includes('retail') || indLower.includes('e-commer') || indLower.includes('ecommer')) {
    painPoints = ['Customer behavior analysis across channels', 'Inventory optimization and demand forecasting', 'Marketing spend ROI tracking', 'Cart abandonment reduction'];
  } else if (indLower.includes('tech') || indLower.includes('software') || indLower.includes('saas')) {
    painPoints = ['User engagement and feature adoption tracking', 'Churn prediction and prevention', 'Revenue forecasting accuracy', 'Product usage analytics'];
  } else if (indLower.includes('manufactur')) {
    painPoints = ['Supply chain visibility and optimization', 'Quality control and defect prediction', 'Production efficiency tracking', 'Inventory management'];
  } else {
    painPoints = ['Data-driven decision making gaps', 'Operational efficiency optimization', 'Customer insights and segmentation', 'Performance tracking and KPI management'];
  }

  let analyticsOpportunities: string[] = [];
  if (leadScore >= 60) {
    analyticsOpportunities = [
      'Executive dashboard for real-time business metrics',
      'Customer segmentation and behavior analysis',
      'Predictive analytics for key business outcomes',
      'Automated reporting pipeline setup',
    ];
  } else {
    analyticsOpportunities = [
      'Data audit and quality assessment',
      'Basic KPI dashboard development',
      'Customer insights report',
    ];
  }

  let recommendedServices: string[] = [];
  if (employeeCount && employeeCount > 200) {
    recommendedServices = ['Data Audit', 'Dashboard Development', 'Predictive Analytics', 'KPI Strategy'];
  } else if (employeeCount && employeeCount > 50) {
    recommendedServices = ['Dashboard Development', 'Automated Reporting', 'Customer Segmentation'];
  } else {
    recommendedServices = ['Data Audit', 'Dashboard Development'];
  }

  let estimatedProjectValue = '$3,000-$8,000';
  if (employeeCount && employeeCount > 200) estimatedProjectValue = '$15,000-$50,000';
  else if (employeeCount && employeeCount > 100) estimatedProjectValue = '$10,000-$25,000';
  else if (employeeCount && employeeCount > 50) estimatedProjectValue = '$5,000-$15,000';

  const potentialROI = `Companies in the ${industry} sector typically see a 3-5x return on analytics investments within 12 months through improved operational efficiency, better customer targeting, and data-driven decision making.`;

  const outreachRecommendations: string[] = [
    `Reference specific ${industry} industry benchmarks in your initial outreach`,
    `Mention a concrete metric improvement (e.g., "companies like yours see 30% faster decisions")`,
    `Offer a free data audit or mini-dashboard as a conversation starter`,
  ];

  return {
    businessSummary,
    painPoints,
    analyticsOpportunities,
    recommendedServices,
    estimatedProjectValue,
    potentialROI,
    outreachRecommendations,
  };
}

// ====== Per-dimension score explanations (Feature 6) ======

export interface Explanations {
  digitalMaturity: string;
  growthPotential: string;
  operationalComplexity: string;
  dataVolume: string;
  marketingSophistication: string;
  urgency: string;
  overall: string;
}

function describeRange(score: number): string {
  if (score >= 80) return 'high';
  if (score >= 60) return 'moderate-to-high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low-to-moderate';
  return 'low';
}

export function generateExplanations(
  lead: Record<string, unknown>,
  scores: Scores
): Explanations {
  const companyName = (lead.companyName || '') as string;
  const industry = (lead.industry || '') as string;
  const employeeCount = parseInt(String(lead.employeeCount ?? '0'), 10) || 0;
  const googleRating = parseFloat(String(lead.googleRating ?? '0')) || 0;
  const reviewCount = parseInt(String(lead.reviewCount ?? '0'), 10) || 0;
  const yearsInBusiness = parseInt(String(lead.yearsInBusiness ?? '0'), 10) || 0;
  const hasWebsite = !!(lead.website);
  const hasLinkedin = !!(lead.linkedinUrl);
  const hasEmail = !!(lead.email);

  const factors: string[] = [];
  if (hasWebsite) factors.push('website');
  if (hasLinkedin) factors.push('LinkedIn');
  if (hasEmail) factors.push('email presence');
  if (googleRating > 0) factors.push(`${googleRating}/5 rating`);
  if (reviewCount > 0) factors.push(`${reviewCount}+ reviews`);
  if (yearsInBusiness > 0) factors.push(`${yearsInBusiness}yr history`);
  const factorStr = factors.length > 0 ? `driven by ${factors.join(', ')}` : 'based on limited available data';

  const digitalMaturity = `${describeRange(scores.digitalMaturity)} digital maturity (${scores.digitalMaturity}/100) ${factorStr} for ${companyName}.`;
  const growthPotential = `${describeRange(scores.growthPotential)} growth potential (${scores.growthPotential}/100) — ${employeeCount > 100 ? 'established team size' : 'growing company'} in ${industry}${yearsInBusiness <= 5 ? ', early-stage signals suggest expansion runway' : yearsInBusiness > 15 ? ', mature but stable' : ''}.`;
  const operationalComplexity = `${describeRange(scores.operationalComplexity)} operational complexity (${scores.operationalComplexity}/100) — ${employeeCount > 500 ? 'large organization with multi-layer processes' : employeeCount > 100 ? 'mid-size team with standard processes' : employeeCount > 50 ? 'growing operations' : 'small, lean team'}.`;
  const dataVolume = `${describeRange(scores.dataVolumeIndicators)} data volume (${scores.dataVolumeIndicators}/100) — ${employeeCount > 200 ? 'high employee count + industry signals suggest significant data generation' : 'company size and industry indicate moderate data flows'}.`;
  const marketingSophistication = `${describeRange(scores.marketingSophistication)} marketing sophistication (${scores.marketingSophistication}/100) — ${hasWebsite && hasLinkedin ? 'multi-channel digital presence' : hasWebsite ? 'web presence without strong social signals' : 'limited digital footprint'}.`;
  const urgency = `${describeRange(scores.urgencyScore)} urgency (${scores.urgencyScore}/100) — ${scores.urgencyScore > 60 ? 'time-sensitive opportunity, recommend fast outreach' : scores.urgencyScore > 40 ? 'moderate urgency, schedule outreach within 2 weeks' : 'no immediate pressure, nurture relationship'}.`;

  const overallLeadLabel = scores.leadScore >= 70 ? 'strong' : scores.leadScore >= 50 ? 'solid' : 'developing';
  const overall = `${companyName} scores ${scores.leadScore}/100 overall — a ${overallLeadLabel} prospect for data analytics services. ${scores.leadScore >= 70 ? 'Prioritize outreach immediately.' : scores.leadScore >= 50 ? 'Good candidate for a targeted campaign.' : 'Consider nurturing before a direct pitch.'}`;

  return { digitalMaturity, growthPotential, operationalComplexity, dataVolume, marketingSophistication, urgency, overall };
}
