/**
 * Re-seed script: Calls AI to re-score and generate insights for the top 5 leads
 * by current score, and uses a fast deterministic algorithm for the rest.
 *
 * Usage: npx tsx scripts/reseed-with-ai.ts
 */

import { PrismaClient } from '@prisma/client';

// We need to import the scoring and insights logic directly
// Since this runs outside Next.js, we need to set up the env
import * as path from 'path';
import * as fs from 'fs';

// Load .env file manually
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

const prisma = new PrismaClient();

// ====== Inline deterministic scoring (same as route, without AI dependency) ======

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
  const companyName = (lead.companyName || '') as string;
  const industry = (lead.industry || '') as string;
  const employeeCount = parseInt(String(lead.employeeCount ?? '0'), 10) || 0;
  const revenueStr = (lead.estimatedRevenue || '') as string;
  const revenue = parseRevenue(revenueStr);
  const googleRating = parseFloat(String(lead.googleRating ?? '0')) || 0;
  const reviewCount = parseInt(String(lead.reviewCount ?? '0'), 10) || 0;
  const yearsInBusiness = parseInt(String(lead.yearsInBusiness ?? '0'), 10) || 0;
  const hasWebsite = !!(lead.website);
  const hasLinkedin = !!(lead.linkedinUrl);
  const hasEmail = !!(lead.email);
  const hasPhone = !!(lead.phone);
  const indLower = industry.toLowerCase();

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

// ====== Inline deterministic insights ======

function generateDeterministicInsights(lead: Record<string, unknown>) {
  const companyName = lead.companyName as string;
  const industry = lead.industry as string;
  const employeeCount = lead.employeeCount as number | null;
  const estimatedRevenue = lead.estimatedRevenue as string | null;
  const leadScore = lead.leadScore as number;
  const googleRating = lead.googleRating as number | null;
  const reviewCount = lead.reviewCount as number | null;
  const yearsInBusiness = lead.yearsInBusiness as number | null;
  const city = lead.city as string | null;
  const state = lead.state as string | null;

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

// ====== AI helpers (using SDK directly) ======

async function callAIScore(lead: Record<string, unknown>) {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const systemPrompt = `You are an expert lead scoring AI for data analytics services. Analyze the given business and return ONLY valid JSON (no markdown, no code blocks) with these fields:
{"leadScore":<number 0-100>,"digitalMaturity":<number 0-100>,"growthPotential":<number 0-100>,"operationalComplexity":<number 0-100>,"dataVolumeIndicators":<number 0-100>,"marketingSophistication":<number 0-100>,"confidenceScore":<number 0.0-1.0>,"urgencyScore":<number 0-100>}

Scoring criteria:
- leadScore: Overall likelihood they need data analytics (higher for tech, finance, healthcare; larger companies; growing businesses)
- digitalMaturity: How digitally mature they appear
- growthPotential: Growth signals
- operationalComplexity: How complex their operations likely are
- dataVolumeIndicators: How much data they likely generate
- marketingSophistication: How sophisticated their marketing appears
- confidenceScore: How confident you are (0.0-1.0)
- urgencyScore: How urgently they might need analytics help (0-100)`;

    const userPrompt = `Analyze this business and score it:
- Company: ${lead.companyName}
- Industry: ${lead.industry}
- Location: ${lead.city || ''}, ${lead.state || ''}
- Company Size: ${lead.companySize || 'Unknown'} (${lead.employeeCount || 'Unknown'} employees)
- Estimated Revenue: ${lead.estimatedRevenue || 'Unknown'}
- Google Rating: ${lead.googleRating || 'N/A'}/5 (${lead.reviewCount || 0} reviews)
- Years in Business: ${lead.yearsInBusiness || 'Unknown'}
- Business Category: ${lead.businessCategory || 'Unknown'}
- Website: ${lead.website || 'Unknown'}`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    let raw = response.choices?.[0]?.message?.content || '';
    // Strip markdown code blocks
    const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) raw = codeBlockMatch[1].trim();
    else {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) raw = jsonMatch[0];
    }

    const parsed = JSON.parse(raw);
    return {
      leadScore: clamp(parsed.leadScore ?? 50, 0, 100),
      digitalMaturity: clamp(parsed.digitalMaturity ?? 50, 0, 100),
      growthPotential: clamp(parsed.growthPotential ?? 50, 0, 100),
      operationalComplexity: clamp(parsed.operationalComplexity ?? 50, 0, 100),
      dataVolumeIndicators: clamp(parsed.dataVolumeIndicators ?? 50, 0, 100),
      marketingSophistication: clamp(parsed.marketingSophistication ?? 50, 0, 100),
      confidenceScore: Math.min(1.0, Math.max(0.0, parseFloat(String(parsed.confidenceScore ?? 0.5)))),
      urgencyScore: clamp(parsed.urgencyScore ?? 50, 0, 100),
    };
  } catch (error) {
    console.warn(`  ⚠ AI scoring failed for ${lead.companyName}, using deterministic fallback`);
    return deterministicScore(lead);
  }
}

async function callAIInsights(lead: Record<string, unknown>) {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const systemPrompt = `You are an expert business analyst specializing in data analytics consulting. Analyze the given business lead and generate deep, actionable insights.

Return ONLY valid JSON (no markdown, no code blocks):
{"businessSummary":"<2-3 sentence professional summary>","painPoints":["<pain point 1>","<pain point 2>","<pain point 3>"],"analyticsOpportunities":["<opportunity 1>","<opportunity 2>","<opportunity 3>"],"recommendedServices":["<service 1>","<service 2>","<service 3>"],"estimatedProjectValue":"<range like $5,000-$15,000>","potentialROI":"<1-2 sentence ROI description>","outreachRecommendations":["<tip 1>","<tip 2>","<tip 3>"]}`;

    const userPrompt = `Generate insights for: ${lead.companyName} (${lead.industry}), ${lead.city || ''} ${lead.state || ''}. ${lead.employeeCount || ''} employees, revenue ${lead.estimatedRevenue || 'unknown'}, rating ${(lead.googleRating || 'N/A')}/5, in business ${lead.yearsInBusiness || 'unknown'} years.`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    let raw = response.choices?.[0]?.message?.content || '';
    const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) raw = codeBlockMatch[1].trim();
    else {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) raw = jsonMatch[0];
    }

    return JSON.parse(raw);
  } catch (error) {
    console.warn(`  ⚠ AI insights failed for ${lead.companyName}, using deterministic fallback`);
    return generateDeterministicInsights(lead);
  }
}

// ====== Main script ======

async function main() {
  console.log('🔄 Re-seed Script: AI-Powered Lead Scoring & Insights');
  console.log('='.repeat(60));

  // Fetch all leads ordered by current score
  const allLeads = await prisma.lead.findMany({
    orderBy: { leadScore: 'desc' },
  });

  console.log(`📊 Found ${allLeads.length} leads in database`);

  if (allLeads.length === 0) {
    console.log('⚠ No leads found. Run the seed script first.');
    await prisma.$disconnect();
    return;
  }

  // Split into AI (top 5) and deterministic (rest)
  const aiLeads = allLeads.slice(0, 5);
  const detLeads = allLeads.slice(5);

  console.log(`🤖 Will use AI for top 5 leads: ${aiLeads.map((l) => l.companyName).join(', ')}`);
  console.log(`⚡ Will use deterministic algorithm for ${detLeads.length} remaining leads`);
  console.log('-'.repeat(60));

  let aiSuccessCount = 0;
  let aiFailCount = 0;
  let detCount = 0;

  // Process AI leads
  for (let i = 0; i < aiLeads.length; i++) {
    const lead = aiLeads[i];
    console.log(`\n🤖 [${i + 1}/5] AI Processing: ${lead.companyName} (current score: ${lead.leadScore})`);

    try {
      // AI Score
      console.log('  📈 Scoring with AI...');
      const scores = await callAIScore(lead);

      // AI Insights
      console.log('  💡 Generating insights with AI...');
      const insights = await callAIInsights(lead);

      // Update database
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          leadScore: scores.leadScore,
          digitalMaturity: scores.digitalMaturity,
          growthPotential: scores.growthPotential,
          operationalComplexity: scores.operationalComplexity,
          dataVolumeIndicators: scores.dataVolumeIndicators,
          marketingSophistication: scores.marketingSophistication,
          confidenceScore: scores.confidenceScore,
          urgencyScore: scores.urgencyScore,
          businessSummary: insights.businessSummary,
          painPoints: JSON.stringify(insights.painPoints),
          analyticsOpportunities: JSON.stringify(insights.analyticsOpportunities),
          recommendedServices: JSON.stringify(insights.recommendedServices),
          estimatedProjectValue: insights.estimatedProjectValue,
          potentialROI: insights.potentialROI,
          outreachRecommendations: JSON.stringify(insights.outreachRecommendations),
        },
      });

      console.log(`  ✅ Score: ${scores.leadScore} (was ${lead.leadScore}) | Confidence: ${scores.confidenceScore}`);
      console.log(`  ✅ Insights: "${insights.businessSummary.substring(0, 80)}..."`);
      aiSuccessCount++;
    } catch (error) {
      console.error(`  ❌ Failed to process ${lead.companyName}:`, error);
      aiFailCount++;
    }
  }

  // Process deterministic leads (in batches for speed)
  console.log(`\n⚡ Processing ${detLeads.length} leads with deterministic algorithm...`);

  for (let i = 0; i < detLeads.length; i++) {
    const lead = detLeads[i];
    try {
      const scores = deterministicScore(lead);
      const insights = generateDeterministicInsights(lead);

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          leadScore: scores.leadScore,
          digitalMaturity: scores.digitalMaturity,
          growthPotential: scores.growthPotential,
          operationalComplexity: scores.operationalComplexity,
          dataVolumeIndicators: scores.dataVolumeIndicators,
          marketingSophistication: scores.marketingSophistication,
          confidenceScore: scores.confidenceScore,
          urgencyScore: scores.urgencyScore,
          businessSummary: insights.businessSummary,
          painPoints: JSON.stringify(insights.painPoints),
          analyticsOpportunities: JSON.stringify(insights.analyticsOpportunities),
          recommendedServices: JSON.stringify(insights.recommendedServices),
          estimatedProjectValue: insights.estimatedProjectValue,
          potentialROI: insights.potentialROI,
          outreachRecommendations: JSON.stringify(insights.outreachRecommendations),
        },
      });

      detCount++;
      if ((i + 1) % 5 === 0 || i === detLeads.length - 1) {
        console.log(`  Progress: ${i + 1}/${detLeads.length} leads processed`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to process ${lead.companyName}:`, error);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 RE-SEED COMPLETE');
  console.log('-'.repeat(60));
  console.log(`  Total leads processed: ${allLeads.length}`);
  console.log(`  AI-powered (top 5): ${aiSuccessCount} success, ${aiFailCount} failed`);
  console.log(`  Deterministic (rest): ${detCount} processed`);
  console.log('='.repeat(60));

  // Show updated top 5
  const updatedTop5 = await prisma.lead.findMany({
    orderBy: { leadScore: 'desc' },
    take: 5,
    select: { companyName: true, leadScore: true, industry: true, businessSummary: true },
  });

  console.log('\n🏆 Updated Top 5 Leads:');
  for (const l of updatedTop5) {
    console.log(`  ${l.leadScore} - ${l.companyName} (${l.industry})`);
    if (l.businessSummary) {
      console.log(`    → ${l.businessSummary.substring(0, 100)}...`);
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Done!');
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});