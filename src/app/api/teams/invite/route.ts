import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { PLANS, type PlanKey } from '@/lib/plans';
import crypto from 'crypto';

const VALID_ROLES = ['owner', 'admin', 'analyst', 'viewer'];

// POST: create an invite for the caller's organization
export async function POST(request: NextRequest) {
  try {
    // Only Owner/Admin may invite (README permission matrix).
    const guard = await requirePermission('members:invite');
    if (!guard.ok) return guard.response;

    const { session, org } = guard.auth;
    const body = await request.json();
    const email = ((body.email as string) || '').trim().toLowerCase();
    const role = (body.role as string) || 'analyst';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role === 'owner' && session.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the owner can invite another owner' },
        { status: 403 }
      );
    }

    // Enforce the plan's seat limit (maxMembers).
    const subscription = await db.subscription.findFirst({
      where: { orgId: org.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    const planConfig = PLANS[(subscription?.plan ?? org.plan) as PlanKey];
    const maxMembers = subscription?.maxMembers ?? planConfig?.maxMembers ?? 1;

    const memberCount = await db.membership.count({ where: { orgId: org.id } });
    if (memberCount >= maxMembers) {
      return NextResponse.json(
        {
          error: `Your ${planConfig?.name ?? org.plan} plan allows ${maxMembers} member${maxMembers === 1 ? '' : 's'}. Upgrade to invite more.`,
        },
        { status: 403 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await db.membership.findUnique({
        where: { userId_orgId: { userId: existingUser.id, orgId: org.id } },
      });
      if (existingMembership) {
        return NextResponse.json(
          { error: 'That person is already a member of this organization' },
          { status: 409 }
        );
      }
    }

    // Reject a second pending invite for the same email.
    const pendingInvite = await db.invite.findFirst({
      where: { orgId: org.id, email, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pendingInvite) {
      return NextResponse.json(
        { error: 'An invite is already pending for that email address' },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await db.invite.create({
      data: {
        orgId: org.id,
        email,
        role,
        token,
        invitedBy: session.userId,
        expiresAt,
      },
    });

    const inviteLink = `${new URL(request.url).origin}/invite/${invite.token}`;

    return NextResponse.json(
      {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        inviteLink,
        expiresAt: invite.expiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
