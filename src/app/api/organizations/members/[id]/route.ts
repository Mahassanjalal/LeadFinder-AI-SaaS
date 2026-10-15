import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';

const VALID_ROLES = ['owner', 'admin', 'analyst', 'viewer'];

// PATCH: update a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only Owner/Admin may manage members (README permission matrix).
    const guard = await requirePermission('members:manage');
    if (!guard.ok) return guard.response;

    const { session, org } = guard.auth;
    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Scope to the caller's organization — memberships of other tenants are 404.
    const membership = await db.membership.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!membership || membership.orgId !== org.id) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    if (membership.role === 'owner') {
      return NextResponse.json(
        { error: 'The organization owner role cannot be changed here' },
        { status: 403 }
      );
    }

    if (role === 'owner' && session.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the owner can grant the owner role' },
        { status: 403 }
      );
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
