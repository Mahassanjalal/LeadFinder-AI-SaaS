import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { pickLeadFields } from '@/lib/lead-input';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry');
    const pipelineStage = searchParams.get('pipelineStage');
    const minScore = searchParams.get('minScore');
    const search = searchParams.get('search');

    const guard = await requirePermission('leads:read');
    if (!guard.ok) return guard.response;
    const org = guard.auth.org;

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

    const guard = await requirePermission('leads:write');
    if (!guard.ok) return guard.response;
    const { org, session } = guard.auth;

    const fields = pickLeadFields(body);
    const companyName = typeof fields.companyName === 'string' ? fields.companyName.trim() : '';
    const industry = typeof fields.industry === 'string' ? fields.industry.trim() : '';
    // `companyName` and `industry` are required by the schema — validate them
    // instead of letting Prisma throw a 500 for a bad request.
    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    if (!industry) {
      return NextResponse.json({ error: 'Industry is required' }, { status: 400 });
    }

    const lead = await db.lead.create({
      data: {
        ...fields,
        companyName,
        industry,
        orgId: org.id,
        createdBy: session.userId,
      },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}