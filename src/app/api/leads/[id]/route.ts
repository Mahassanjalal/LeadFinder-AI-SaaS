import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { pickLeadFields } from '@/lib/lead-input';
import { logActivity } from '@/lib/activity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('leads:read');
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const lead = await db.lead.findFirst({
      where: { id, orgId: guard.auth.org.id },
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
    const guard = await requirePermission('leads:write');
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const body = await request.json();
    const org = guard.auth.org;

    const lead = await db.lead.findFirst({ where: { id, orgId: org.id } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const fields = pickLeadFields(body);
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await db.lead.update({
      where: { id },
      data: fields,
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
    const guard = await requirePermission('leads:delete');
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const lead = await db.lead.findFirst({ where: { id, orgId: guard.auth.org.id } });
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
