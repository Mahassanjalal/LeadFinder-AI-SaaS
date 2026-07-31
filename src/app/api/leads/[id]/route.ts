import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/session';
import { logActivity } from '@/lib/activity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const org = await resolveOrg();
    const lead = await db.lead.findFirst({
      where: { id, ...(org ? { orgId: org.id } : {}) },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const org = await resolveOrg();
    const lead = await db.lead.findFirst({ where: { id, ...(org ? { orgId: org.id } : {}) } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    const updated = await db.lead.update({
      where: { id },
      data: body,
    });

    // Auto-log activities for meaningful field changes
    if (body.pipelineStage && body.pipelineStage !== lead.pipelineStage) {
      await logActivity(id, 'stage_changed', 'Pipeline stage changed',
        `${lead.pipelineStage} → ${body.pipelineStage}`);
    }
    if (body.outreachStatus && body.outreachStatus !== lead.outreachStatus) {
      await logActivity(id, 'outreach_status_changed', 'Outreach status updated',
        `${lead.outreachStatus} → ${body.outreachStatus}`);
    }
    if (body.isFavorite !== undefined && body.isFavorite !== lead.isFavorite) {
      await logActivity(id, body.isFavorite ? 'favorited' : 'unfavorited',
        body.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const org = await resolveOrg();
    const lead = await db.lead.findFirst({ where: { id, ...(org ? { orgId: org.id } : {}) } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    await db.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
