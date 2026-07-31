import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatCompletion, parseAIJson } from '@/lib/ai-client';
import { checkLimit, trackUsage } from '@/lib/usage';
import { resolveOrg } from '@/lib/session';
import { generateDeterministicInsights } from '@/lib/scoring';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const leadId = body.leadId || body.id;

    if (!leadId) {
      return NextResponse.json({ error: 'Missing required field: leadId' }, { status: 400 });
    }

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const org = await resolveOrg();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const limit = await checkLimit(org.id, 'ai_insights');
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Monthly AI insights limit reached. Upgrade your plan for more credits.' },
        { status: 403 }
      );
    }

    const locationStr = lead.city ? `${lead.city}, ${lead.state || ''}`.trim() : 'Unknown';

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

    let insights: Awaited<ReturnType<typeof generateDeterministicInsights>>;

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

    await trackUsage(org.id, 'system', 'ai_insights', `Generated insights for ${lead.companyName}`);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
