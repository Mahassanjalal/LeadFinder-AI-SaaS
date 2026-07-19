import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatCompletion, parseAIJson } from '@/lib/ai-client';

const INSIGHTS_SYSTEM_PROMPT = `You are an expert business analyst specializing in data analytics consulting. Analyze the given business lead and generate deep, actionable insights.

Return ONLY valid JSON (no markdown, no code blocks) with these fields:
{
  "businessSummary": "<2-3 sentence professional summary of what this business likely does and their market position>",
  "painPoints": ["<specific pain point 1>", "<specific pain point 2>", "<specific pain point 3>", "<optional pain point 4>", "<optional pain point 5>"],
  "analyticsOpportunities": ["<specific opportunity 1>", "<specific opportunity 2>", "<specific opportunity 3>", "<optional opportunity 4>", "<optional opportunity 5>"],
  "recommendedServices": ["<service 1>", "<service 2>", "<optional service 3>", "<optional service 4>"],
  "estimatedProjectValue": "<estimated value range like '$5,000-$15,000'>",
  "potentialROI": "<1-2 sentence description of the expected return on investment>",
  "outreachRecommendations": ["<tip 1>", "<tip 2>", "<tip 3>"]
}

Guidelines:
- businessSummary: Professional, factual, based on the available data about the company
- painPoints: Be specific to their industry and company size. E.g., for a 200-person healthcare company: "Patient flow optimization", "Claims processing bottlenecks"
- analyticsOpportunities: Specific, actionable analytics projects. E.g., "Customer churn prediction model", "Revenue attribution dashboard"
- recommendedServices: From this list - Dashboard Development, Data Pipeline Setup, Predictive Analytics, Customer Segmentation, A/B Testing Framework, KPI Strategy, Data Audit, Automated Reporting, Market Analysis, Financial Modeling
- estimatedProjectValue: Be realistic based on company size and complexity. Small (<50 emp): $2K-$8K, Medium (50-200): $5K-$20K, Large (200+): $15K-$50K+
- potentialROI: Describe concrete ROI in terms of time savings, revenue increase, or cost reduction
- outreachRecommendations: Specific, actionable tips for the best approach to contact them`;

function generateDeterministicInsights(lead: {
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
}) {
  const { companyName, industry, employeeCount, estimatedRevenue, leadScore, googleRating, reviewCount, yearsInBusiness, city, state } = lead;
  const locationStr = city ? `${city}${state ? `, ${state}` : ''}` : '';
  const sizeStr = employeeCount ? `${employeeCount} employees` : '';

  const businessSummary = `${companyName} is a ${industry} company${locationStr ? ` based in ${locationStr}` : ''}${sizeStr ? ` with approximately ${sizeStr}` : ''}${yearsInBusiness ? `, established ${yearsInBusiness} years ago` : ''}. ${estimatedRevenue ? `With estimated revenue of ${estimatedRevenue},` : ''} they represent a ${leadScore >= 70 ? 'strong' : leadScore >= 50 ? 'moderate' : 'developing'} opportunity for data analytics services.`;

  // Generate industry-specific pain points
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

  // Estimate project value
  let estimatedProjectValue = '$3,000-$8,000';
  if (employeeCount && employeeCount > 200) estimatedProjectValue = '$15,000-$50,000';
  else if (employeeCount && employeeCount > 100) estimatedProjectValue = '$10,000-$25,000';
  else if (employeeCount && employeeCount > 50) estimatedProjectValue = '$5,000-$15,000';

  const potentialROI = `Companies in the ${industry} sector typically see a 3-5x return on analytics investments within 12 months through improved operational efficiency, better customer targeting, and data-driven decision making.`;

  let outreachRecommendations: string[] = [
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const leadId = body.leadId || body.id;

    if (!leadId) {
      return NextResponse.json({ error: 'Missing required field: leadId' }, { status: 400 });
    }

    // Fetch the lead from database
    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const locationStr = lead.city ? `${lead.city}, ${lead.state || ''}`.trim() : 'Unknown';

    // Build user prompt for AI
    const userPrompt = `Generate deep business insights for this lead:

Company: ${lead.companyName}
Industry: ${lead.industry}
Location: ${locationStr}
Company Size: ${lead.companySize || 'Unknown'} (${lead.employeeCount ?? 'Unknown'} employees)
Estimated Revenue: ${lead.estimatedRevenue || 'Unknown'}
Google Rating: ${lead.googleRating ?? 'N/A'}/5 (${lead.reviewCount ?? 0} reviews)
Years in Business: ${lead.yearsInBusiness ?? 'Unknown'}
Business Category: ${lead.businessCategory || 'Unknown'}
Website: ${lead.website || 'Unknown'}
Current Lead Score: ${lead.leadScore}
Digital Maturity: ${lead.digitalMaturity ?? 'N/A'}
Growth Potential: ${lead.growthPotential ?? 'N/A'}
Operational Complexity: ${lead.operationalComplexity ?? 'N/A'}
Data Volume Indicators: ${lead.dataVolumeIndicators ?? 'N/A'}
Marketing Sophistication: ${lead.marketingSophistication ?? 'N/A'}
Urgency Score: ${lead.urgencyScore ?? 'N/A'}
Decision Maker: ${lead.decisionMaker || 'Unknown'} (${lead.decisionMakerTitle || 'Unknown'})`;

    let insights: {
      businessSummary: string;
      painPoints: string[];
      analyticsOpportunities: string[];
      recommendedServices: string[];
      estimatedProjectValue: string;
      potentialROI: string;
      outreachRecommendations: string[];
    };

    // Try AI insights generation
    try {
      const aiResponse = await chatCompletion(INSIGHTS_SYSTEM_PROMPT, userPrompt);
      const parsed = parseAIJson<typeof insights>(aiResponse);

      if (parsed && parsed.businessSummary && parsed.painPoints && parsed.painPoints.length > 0) {
        insights = parsed;
      } else {
        throw new Error('AI returned incomplete insights');
      }
    } catch (aiError) {
      console.warn('AI insights generation failed, falling back to deterministic algorithm:', aiError);
      insights = generateDeterministicInsights(lead);
    }

    // Store insights back on the lead record
    try {
      await db.lead.update({
        where: { id: leadId },
        data: {
          businessSummary: insights.businessSummary,
          painPoints: JSON.stringify(insights.painPoints),
          analyticsOpportunities: JSON.stringify(insights.analyticsOpportunities),
          recommendedServices: JSON.stringify(insights.recommendedServices),
          estimatedProjectValue: insights.estimatedProjectValue,
          potentialROI: insights.potentialROI,
          outreachRecommendations: JSON.stringify(insights.outreachRecommendations),
        },
      });
    } catch (dbError) {
      console.warn('Failed to update lead insights in database:', dbError);
    }

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}