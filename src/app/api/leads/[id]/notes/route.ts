import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireLead } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guard = await requireLead('leads:read', id);
    if (!guard.ok) return guard.response;

    const notes = await db.note.findMany({
      where: { leadId: guard.lead.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
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
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    const note = await db.note.create({
      data: {
        content,
        leadId: guard.lead.id,
        authorId: guard.auth.session.userId,
      },
    });

    // Auto-log note creation as an activity
    await logActivity(
      guard.lead.id,
      'note_added',
      'Note added',
      content.slice(0, 120),
      guard.auth.session.userId
    );

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
