import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireLead } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guard = await requireLead('leads:read', id);
    if (!guard.ok) return guard.response;

    const activities = await db.activity.findMany({
      where: { leadId: guard.lead.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guard = await requireLead('leads:write', id);
    if (!guard.ok) return guard.response;

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return NextResponse.json({ error: 'Activity title is required' }, { status: 400 });
    }

    const activity = await db.activity.create({
      data: {
        type: typeof body.type === 'string' && body.type ? body.type : 'note',
        title,
        description:
          typeof body.description === 'string' && body.description.trim()
            ? body.description.trim()
            : null,
        leadId: guard.lead.id,
        userId: guard.auth.session.userId,
      },
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
