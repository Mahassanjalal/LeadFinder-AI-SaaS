import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const VALID_ROLES = ['owner', 'admin', 'analyst', 'viewer'];

// PATCH: update a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Ensure the membership exists
    const membership = await db.membership.findUnique({
      where: { id },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    const updated = await db.membership.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json({ id: updated.id, role: updated.role });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
  }
}
