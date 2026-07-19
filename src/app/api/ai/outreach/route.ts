import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, parseAIJson } from '@/lib/ai-client';

type MessageType = 'cold_email' | 'linkedin_connection' | 'linkedin_message' | 'follow_up' | 'proposal_intro' | 'call_script' | 'demo_request';

interface OutreachRequest {
  companyName: string;
  industry: string;
  contactName?: string;
  contactTitle?: string;
  city?: string;
  state?: string;
  leadScore?: number;
  painPoints?: string | string[];
  employeeCount?: number;
  revenue?: string;
  companySize?: string;
  googleRating?: number;
  reviewCount?: number;
  yearsInBusiness?: number;
  estimatedRevenue?: string;
  businessSummary?: string;
  messageType: string;
  decisionMaker?: string;
  decisionMakerTitle?: string;
}

// ====== Fallback generators (original deterministic logic) ======

function generateColdEmail(data: OutreachRequest): { subject: string; body: string } {
  const { companyName, industry, contactName, contactTitle, city, state, leadScore, painPoints, employeeCount } = data;

  const greeting = contactName ? `Hi ${contactName},` : `Hi team at ${companyName},`;

  const painPointsStr = typeof painPoints === 'string' ? painPoints : Array.isArray(painPoints) ? painPoints.join(', ') : '';
  const painPointContext = painPointsStr
    ? `\n\nI noticed that ${companyName} has been working hard in the ${industry} space. Based on publicly available data, it seems like ${painPointsStr.toLowerCase()} could be an area where data-driven insights might make a real difference.`
    : `\n\nAs a ${industry} company${employeeCount ? ` with ${employeeCount}+ team members` : ''}, you're likely sitting on a wealth of data that could be driving smarter decisions across your organization.`;

  const scoreContext = leadScore && leadScore > 70
    ? ` Companies at your scale in ${industry} typically see 30-40% improvement in decision-making speed when they implement structured analytics.`
    : '';

  const locationStr = city ? ` in ${city}${state ? `, ${state}` : ''}` : '';

  const subject = contactName
    ? `${contactName}, helping ${companyName} unlock growth${locationStr}`
    : `Quick question about ${companyName}'s growth strategy${locationStr}`;

  const body = `${greeting}

I came across ${companyName}${locationStr} while researching innovative companies in the ${industry} sector, and I was genuinely impressed by what you've built.${painPointContext}${scoreContext}

I'd love to share a few insights specific to the ${industry} industry that have helped similar companies turn their data into actionable growth strategies — at no cost or obligation.

Would you be open to a brief 15-minute conversation this week?

Best regards`;

  return { subject, body };
}

function generateLinkedinConnection(data: OutreachRequest): { subject: string; body: string } {
  const { companyName, industry, contactName, contactTitle, leadScore } = data;
  const titleContext = contactTitle
    ? ` As a ${contactTitle} at ${companyName}, you're likely focused on scaling effectively.`
    : '';
  const scoreContext = leadScore && leadScore > 60
    ? ` I've been following ${companyName}'s trajectory in ${industry} and see significant potential for data-driven optimization.`
    : ` I'm always interested in connecting with professionals in the ${industry} space.`;

  return {
    subject: `Connection request: ${contactName || companyName}`,
    body: `Hi ${contactName || 'there'},${titleContext}${scoreContext}

I specialize in helping ${industry} companies leverage analytics to drive measurable growth. Would love to connect and share some industry-specific insights that might be valuable for ${companyName}.

Looking forward to connecting!`,
  };
}

function generateLinkedinMessage(data: OutreachRequest): { subject: string; body: string } {
  const { companyName, industry, contactName } = data;
  return {
    subject: '',
    body: `Hi ${contactName || 'there'},

I've been following ${companyName}'s work in the ${industry} space and noticed some interesting challenges that data analytics could really help with. Companies in ${industry} are often sitting on untapped data that could transform their decision-making.

Would you be open to a quick 10-minute chat about some industry-specific insights I've compiled? No pitch — just value.

Looking forward to hearing from you!`,
  };
}

function generateFollowUp(data: OutreachRequest): { subject: string; body: string } {
  const { companyName, industry, contactName, painPoints } = data;
  const ppStr = typeof painPoints === 'string' ? painPoints : Array.isArray(painPoints) ? painPoints.join(', ') : '';
  const painRef = ppStr
    ? `I mentioned the opportunity around ${ppStr.toLowerCase().split(',')[0]}`
    : `I reached out about data analytics opportunities`;

  return {
    subject: `Re: ${companyName} — following up`,
    body: `Hi ${contactName || 'team'},

Just floating this to the top of your inbox. I ${painRef} at ${companyName} last week and wanted to see if this is something you've had a chance to think about.

I know how busy things get in the ${industry} space, so I'll keep this brief — happy to work around your schedule for a quick chat.

No pressure at all, just wanted to make sure this didn't get lost.

Best regards`,
  };
}

function generateProposalIntro(data: OutreachRequest): { subject: string; body: string } {
  const { companyName, industry, contactName, painPoints, leadScore } = data;
  const ppStr = typeof painPoints === 'string' ? painPoints : Array.isArray(painPoints) ? painPoints.join(', ') : '';
  const painContext = ppStr
    ? `Specifically, I'd love to help address the challenges around ${ppStr.toLowerCase()} that many ${industry} companies face.`
    : `I've identified several areas where data analytics could create immediate value for ${companyName}.`;

  return {
    subject: `Proposal: Data Analytics Strategy for ${companyName}`,
    body: `Hi ${contactName || 'team'},

Thank you for your interest in exploring data analytics for ${companyName}. Based on my analysis of your ${industry} operation${leadScore && leadScore > 60 ? ' and our previous conversations' : ''}, I'm excited about the possibilities.

${painContext}

Here's what I'd propose as a starting point:
• A comprehensive data audit to identify your highest-impact opportunities
• Custom dashboard development for real-time visibility into key metrics
• A prioritized roadmap of analytics initiatives ranked by ROI potential

I've attached some case studies from similar ${industry} companies that saw measurable results within 90 days.

Would you like to schedule a call to discuss this in more detail?

Best regards`,
  };
}

function generateCallScript(data: OutreachRequest): { subject: string; body: string } {
  const { companyName, industry, contactName, painPoints, employeeCount } = data;
  const ppStr = typeof painPoints === 'string' ? painPoints : Array.isArray(painPoints) ? painPoints.join(', ') : '';

  return {
    subject: '',
    body: `Call Script for ${companyName}

[OPENING]
"Hi ${contactName || 'there'}, thanks for taking a few minutes. I wanted to share some insights I've put together specifically for ${companyName}."

[DISCOVERY QUESTIONS]
- "What does your current reporting process look like?"
- "Are there any metrics you wish you had better visibility into?"
- "How does your team currently make decisions about ${industry === 'Technology' || industry === 'Software' ? 'product features' : 'business strategy'}?"
- ${ppStr ? `"I noticed that ${ppStr.toLowerCase()} might be a challenge — is that something you're actively working on?"` : `"What's the biggest data challenge your team is currently facing?"`}

[VALUE PROPOSITION]
"Based on what I'm seeing, ${employeeCount && employeeCount > 50 ? 'with your team size' : 'as a growing company'}, there's likely significant untapped potential in your data. I've helped similar ${industry} companies improve their decision-making by 30-40% through better analytics."

[CALL TO ACTION]
"Would you be open to a deeper dive where I can show you a customized analysis? I could have something ready by [day of week]."

[HANDLING OBJECTIONS]
- "Too busy right now" → "Totally understand. Would it help if I sent over a brief report you can review on your own time?"
- "Already have tools" → "Great — I often find companies have the tools but not the strategy. Could be worth a quick review to make sure you're getting full value."
- "Not a priority" → "Fair enough. The companies I work with usually find that analytics becomes a priority once they see how much revenue they're leaving on the table."`,
  };
}

function generateDemoRequest(data: OutreachRequest): { subject: string; body: string } {
  const { companyName, industry, contactName, employeeCount } = data;
  const scaleRef = employeeCount && employeeCount > 100
    ? `At ${companyName}'s scale, even small efficiency gains compound quickly.`
    : `For a growing company like ${companyName}, getting analytics right early can be a game-changer.`;

  return {
    subject: `Demo: How ${companyName} can turn data into growth`,
    body: `Hi ${contactName || 'team'},

Following our conversation, I'd love to show you exactly how our analytics platform can help ${companyName} in the ${industry} space.

${scaleRef}

I've prepared a customized demo that showcases:
• Industry-specific dashboards for ${industry}
• Real-time KPI tracking tailored to your business model
• Automated reporting that saves your team hours each week
• Predictive insights to stay ahead of market trends

Would a 30-minute demo this week work for you? I have availability on Tuesday or Thursday afternoon.

Looking forward to showing you what's possible!

Best regards`,
  };
}

const fallbackGenerators: Record<string, (data: OutreachRequest) => { subject: string; body: string }> = {
  cold_email: generateColdEmail,
  linkedin_connection: generateLinkedinConnection,
  linkedin: generateLinkedinConnection,
  linkedin_message: generateLinkedinMessage,
  follow_up: generateFollowUp,
  followUp: generateFollowUp,
  proposal_intro: generateProposalIntro,
  proposalIntro: generateProposalIntro,
  call_script: generateCallScript,
  callScript: generateCallScript,
  demo_request: generateDemoRequest,
  demoRequest: generateDemoRequest,
};

// ====== AI Outreach Generation ======

function buildOutreachSystemPrompt(messageType: string, data: OutreachRequest): string {
  const { companyName, industry, city, state, companySize, employeeCount, estimatedRevenue, googleRating, reviewCount, yearsInBusiness, decisionMaker, decisionMakerTitle, painPoints, businessSummary } = data;

  const ppStr = typeof painPoints === 'string' ? painPoints : Array.isArray(painPoints) ? (painPoints as string[]).join(', ') : 'Not available';
  const locationStr = city ? `${city}, ${state || ''}`.trim() : 'Unknown location';

  return `You are an expert cold outreach specialist for freelance data analysts. Generate a personalized ${messageType} for reaching out to ${companyName}, a ${industry} company in ${locationStr}.

Company details:
- Company size: ${companySize || 'Unknown'} (${employeeCount ?? 'Unknown'} employees)
- Estimated revenue: ${estimatedRevenue || 'Unknown'}
- Google rating: ${googleRating ?? 'N/A'}/5 (${reviewCount ?? 0} reviews)
- Years in business: ${yearsInBusiness ?? 'Unknown'}
- Decision maker: ${decisionMaker || 'Unknown'}, ${decisionMakerTitle || 'Unknown'}
- Known pain points: ${ppStr}
- Business summary: ${businessSummary || 'Not available'}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "subject": "<email subject line if applicable, or empty string for non-email>",
  "body": "<the full message text>"
}

For cold emails: professional but warm tone, 3-4 short paragraphs max, specific references to their business
For LinkedIn connection: brief, personalized, 2-3 sentences
For LinkedIn message: conversational, reference their industry challenges, suggest a quick chat
For follow-up: polite, reference previous outreach, add new value
For proposal intro: professional, highlight specific services relevant to their pain points
For call script: conversational questions, discovery-focused, natural flow`;
}

export async function POST(request: NextRequest) {
  try {
    const body: OutreachRequest = await request.json();

    if (!body.companyName || !body.industry || !body.messageType) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, industry, messageType' },
        { status: 400 }
      );
    }

    const messageType = body.messageType;

    // Try AI generation first
    try {
      const systemPrompt = buildOutreachSystemPrompt(messageType, body);
      const userPrompt = `Generate the ${messageType} outreach message now.`;

      const aiResponse = await chatCompletion(systemPrompt, userPrompt);
      const parsed = parseAIJson<{ subject: string; body: string }>(aiResponse);

      if (parsed && parsed.body && parsed.body.trim().length > 20) {
        return NextResponse.json({
          subject: parsed.subject || '',
          body: parsed.body.trim(),
        });
      }
      throw new Error('AI returned invalid or too-short message');
    } catch (aiError) {
      console.warn('AI outreach generation failed, falling back to deterministic generator:', aiError);
    }

    // Fallback to deterministic generator
    const normalizedType = messageType.replace(/-/g, '_').replace(/([A-Z])/g, (match) => '_' + match.toLowerCase()).replace(/^_/, '');
    let generator = fallbackGenerators[messageType] || fallbackGenerators[normalizedType] || fallbackGenerators['cold_email'];

    const result = generator(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating outreach message:', error);
    return NextResponse.json({ error: 'Failed to generate outreach message' }, { status: 500 });
  }
}