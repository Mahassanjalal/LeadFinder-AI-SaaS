import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatCompletion, parseAIJson } from '@/lib/ai-client';
import { checkLimit, trackUsage } from '@/lib/usage';
import { requirePermission } from '@/lib/api-auth';
import { deterministicScore, generateExplanations, clamp, type Scores } from '@/lib/scoring';

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

    const guard = await requirePermission('ai:score');
    if (!guard.ok) return guard.response;
    const { org, session } = guard.auth;

    const limit = await checkLimit(org.id, 'ai_score');
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Monthly AI scoring limit reached. Upgrade your plan for more credits.' },
        { status: 403 }
      );
    }

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

    let scores: Scores;

    // Try AI scoring first
    try {
      const aiResponse = await chatCompletion(SCORE_SYSTEM_PROMPT, userPrompt);
      const parsed = parseAIJson<Scores>(aiResponse);

      if (parsed && typeof parsed.leadScore === 'number') {
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
      scores = deterministicScore(lead);
    }

    // Update the lead in the database if we have an ID
    if (leadId) {
      try {
        const explanations = generateExplanations(lead, scores);
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
            aiExplanations: JSON.stringify(explanations),
          },
        });
      } catch (dbError) {
        console.warn('Failed to update lead in database:', dbError);
      }
    }

    await trackUsage(org.id, session.userId, 'ai_score', `Scored ${companyName || 'lead'}`);

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error computing AI score:', error);
    return NextResponse.json({ error: 'Failed to compute score' }, { status: 500 });
  }
}
