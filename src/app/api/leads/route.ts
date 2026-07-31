import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry');
    const pipelineStage = searchParams.get('pipelineStage');
    const minScore = searchParams.get('minScore');
    const search = searchParams.get('search');

    // Get first org (in production, from session)
    const org = await resolveOrg();
    if (!org) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { orgId: org.id };

    if (industry) where.industry = industry;
    if (pipelineStage) where.pipelineStage = pipelineStage;
    if (minScore) where.leadScore = { gte: parseInt(minScore, 10) };
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } },
        { state: { contains: search } },
        { decisionMaker: { contains: search } },
      ];
    }

    const leads = await db.lead.findMany({
      where: Object.keys(where).length > 1 ? where : { orgId: org.id },
      orderBy: { leadScore: 'desc' },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const org = await resolveOrg();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const lead = await db.lead.create({
      data: { ...body, orgId: org.id },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}