import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { chatCompletion, parseAIJson } from '@/lib/ai-client';
import { resolveOrg } from '@/lib/session';

// ====== Deterministic fallback ======

function buildBestProspectReason(lead: { companyName: string; industry: string; leadScore: number; employeeCount: number | null; estimatedRevenue: string | null }): string {
  const reasons: string[] = [];
  if (lead.leadScore >= 80) reasons.push('exceptionally high lead score');
  else if (lead.leadScore >= 65) reasons.push('strong lead score');

  if (lead.employeeCount && lead.employeeCount > 100) reasons.push(`${lead.employeeCount}+ employees indicates significant opportunity`);
  if (lead.estimatedRevenue && lead.estimatedRevenue.includes('M')) reasons.push(`estimated revenue of ${lead.estimatedRevenue}`);

  const topIndustries = ['Technology', 'Finance', 'Healthcare', 'Software', 'E-commerce'];
  if (topIndustries.some((i) => lead.industry.includes(i))) {
    reasons.push(`${lead.industry} is a high-fit industry`);
  }

  if (reasons.length === 0) reasons.push('solid overall profile');
  return `${reasons.slice(0, 2).join(' + ')}.`;
}

function deterministicRecommendations(leads: Awaited<ReturnType<typeof db.lead.findMany>>) {
  const avgScore = Math.round(leads.reduce((sum, l) => sum + l.leadScore, 0) / leads.length);

  const bestProspects = leads.slice(0, 5).map((l) => ({
    id: l.id,
    companyName: l.companyName,
    industry: l.industry,
    leadScore: l.leadScore,
    city: l.city,
    state: l.state,
    employeeCount: l.employeeCount,
    estimatedRevenue: l.estimatedRevenue,
    reason: buildBestProspectReason(l),
  }));

  const quickWins = leads
    .filter((l) => l.outreachStatus === 'Not Contacted' && l.leadScore >= 60)
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      companyName: l.companyName,
      industry: l.industry,
      leadScore: l.leadScore,
      outreachStatus: l.outreachStatus,
      reason: `High score (${l.leadScore}) and not yet contacted — prime for first outreach.`,
    }));

  const warmLeads = leads
    .filter((l) => l.outreachStatus && l.outreachStatus !== 'Not Contacted' && l.leadScore >= 50)
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      companyName: l.companyName,
      industry: l.industry,
      leadScore: l.leadScore,
      outreachStatus: l.outreachStatus,
      pipelineStage: l.pipelineStage,
      reason: `Already engaged (status: ${l.outreachStatus}) with solid score — good follow-up candidate.`,
    }));

  const highUrgency = leads
    .filter((l) => l.urgencyScore !== null && l.urgencyScore !== undefined)
    .sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0))
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      companyName: l.companyName,
      industry: l.industry,
      urgencyScore: l.urgencyScore,
      leadScore: l.leadScore,
      reason: `Urgency score of ${l.urgencyScore} suggests time-sensitive opportunity.`,
    }));

  const industryMap = new Map<string, { count: number; totalScore: number; avgScore: number }>();
  for (const lead of leads) {
    const ind = lead.industry || 'Unknown';
    const existing = industryMap.get(ind);
    if (existing) {
      existing.count += 1;
      existing.totalScore += lead.leadScore;
      existing.avgScore = Math.round(existing.totalScore / existing.count);
    } else {
      industryMap.set(ind, { count: 1, totalScore: lead.leadScore, avgScore: lead.leadScore });
    }
  }
  const industryOpportunities = Array.from(industryMap.entries())
    .map(([industry, data]) => ({
      industry,
      leadCount: data.count,
      avgScore: data.avgScore,
      potential: data.avgScore > 60 ? 'high' : data.avgScore > 40 ? 'medium' : 'low',
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8);

  return {
    bestProspects,
    quickWins,
    warmLeads,
    highUrgency,
    industryOpportunities,
    summary: {
      totalLeads: leads.length,
      avgScore,
      message:
        avgScore >= 65
          ? 'Your pipeline is looking strong! Focus on converting your top prospects.'
          : avgScore >= 45
            ? 'Decent pipeline. Consider discovering more leads to improve your average score.'
            : 'Your pipeline needs attention. Try discovering leads in high-fit industries like Technology, Finance, or Healthcare.',
    },
  };
}

// ====== AI-powered recommendations ======

const RECOMMENDATIONS_SYSTEM_PROMPT = `You are an expert sales strategist for freelance data analytics services. Given a list of business leads with their scores and details, analyze them and return ONLY valid JSON (no markdown, no code blocks) with these categories:

{
  "bestProspects": [
    {
      "id": "<lead id>",
      "companyName": "<company name>",
      "industry": "<industry>",
      "leadScore": <number>,
      "city": "<city>",
      "state": "<state>",
      "employeeCount": <number or null>,
      "estimatedRevenue": "<revenue or null>",
      "reason": "<1-2 sentence explanation of why this is a top prospect, referencing specific data points>"
    }
  ],
  "quickWins": [
    {
      "id": "<lead id>",
      "companyName": "<company name>",
      "industry": "<industry>",
      "leadScore": <number>,
      "outreachStatus": "<current status>",
      "reason": "<why this is a quick win>"
    }
  ],
  "warmLeads": [
    {
      "id": "<lead id>",
      "companyName": "<company name>",
      "industry": "<industry>",
      "leadScore": <number>,
      "outreachStatus": "<current status>",
      "pipelineStage": "<current stage>",
      "reason": "<why follow up now>"
    }
  ],
  "highUrgency": [
    {
      "id": "<lead id>",
      "companyName": "<company name>",
      "industry": "<industry>",
      "urgencyScore": <number>,
      "leadScore": <number>,
      "reason": "<why this is time-sensitive>"
    }
  ],
  "industryOpportunities": [
    {
      "industry": "<industry name>",
      "leadCount": <number>,
      "avgScore": <number>,
      "potential": "<high|medium|low>"
    }
  ],
  "summary": {
    "totalLeads": <number>,
    "avgScore": <number>,
    "message": "<2-3 sentence strategic overview of the pipeline>"
  }
}

Rules:
- bestProspects: Top 5 leads by overall score, with AI-generated reasoning about why they're the best fit
- quickWins: Smaller companies or lower-friction opportunities that could close quickly
- warmLeads: Leads already contacted or engaged — focus on why NOW is the right time to follow up
- highUrgency: Leads showing signals they need help immediately
- industryOpportunities: Which industries show the most collective potential
- Keep each "reason" field specific and actionable, referencing actual data from the leads`;

export async function GET() {
  try {
    const leads = await db.lead.findMany({
      orderBy: { leadScore: 'desc' },
    });

    if (leads.length === 0) {
      return NextResponse.json({
        bestProspects: [],
        quickWins: [],
        warmLeads: [],
        highUrgency: [],
        industryOpportunities: [],
        summary: {
          totalLeads: 0,
          avgScore: 0,
          message: 'No leads in the database yet. Discover some businesses to get started!',
        },
      });
    }

    // Try AI-powered analysis first
    try {
      const leadsData = leads.map((l) => ({
        id: l.id,
        companyName: l.companyName,
        industry: l.industry,
        city: l.city,
        state: l.state,
        employeeCount: l.employeeCount,
        estimatedRevenue: l.estimatedRevenue,
        companySize: l.companySize,
        googleRating: l.googleRating,
        reviewCount: l.reviewCount,
        yearsInBusiness: l.yearsInBusiness,
        businessCategory: l.businessCategory,
        leadScore: l.leadScore,
        digitalMaturity: l.digitalMaturity,
        growthPotential: l.growthPotential,
        operationalComplexity: l.operationalComplexity,
        dataVolumeIndicators: l.dataVolumeIndicators,
        marketingSophistication: l.marketingSophistication,
        confidenceScore: l.confidenceScore,
        urgencyScore: l.urgencyScore,
        outreachStatus: l.outreachStatus,
        pipelineStage: l.pipelineStage,
        businessSummary: l.businessSummary,
        painPoints: l.painPoints,
      }));

      const userPrompt = `Analyze these ${leadsData.length} leads and generate strategic recommendations:\n\n${JSON.stringify(leadsData, null, 2)}`;

      const aiResponse = await chatCompletion(RECOMMENDATIONS_SYSTEM_PROMPT, userPrompt);
      const parsed = parseAIJson<{
        bestProspects: Array<{
          id: string;
          companyName: string;
          industry: string;
          leadScore: number;
          city?: string;
          state?: string;
          employeeCount?: number | null;
          estimatedRevenue?: string | null;
          reason: string;
        }>;
        quickWins: Array<{
          id: string;
          companyName: string;
          industry: string;
          leadScore: number;
          outreachStatus?: string;
          reason: string;
        }>;
        warmLeads: Array<{
          id: string;
          companyName: string;
          industry: string;
          leadScore: number;
          outreachStatus?: string;
          pipelineStage?: string;
          reason: string;
        }>;
        highUrgency: Array<{
          id: string;
          companyName: string;
          industry: string;
          urgencyScore: number;
          leadScore: number;
          reason: string;
        }>;
        industryOpportunities: Array<{
          industry: string;
          leadCount: number;
          avgScore: number;
          potential: string;
        }>;
        summary: {
          totalLeads: number;
          avgScore: number;
          message: string;
        };
      }>(aiResponse);

      if (parsed && parsed.bestProspects && parsed.bestProspects.length > 0) {
        // Validate that the IDs in AI response match real leads
        const leadIds = new Set(leads.map((l) => l.id));
        const isValid =
          parsed.bestProspects.every((p) => leadIds.has(p.id)) &&
          parsed.summary &&
          typeof parsed.summary.totalLeads === 'number';

        if (isValid) {
          return NextResponse.json(parsed);
        }
      }
      throw new Error('AI response was invalid or incomplete');
    } catch (aiError) {
      console.warn('AI recommendations failed, falling back to deterministic algorithm:', aiError);
    }

    // Fallback to deterministic recommendations
    const result = deterministicRecommendations(leads);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}