import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/api-auth';

// GET current user's organization + subscription info
export async function GET() {
  try {
    const guard = await requireAuth();
    if (!guard.ok) return guard.response;

    const org = guard.auth.org;

    const fullOrg = await db.organization.findUnique({
      where: { id: org.id },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: {
          select: { leads: true, invites: true },
        },
      },
    });

    if (!fullOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const subscription = fullOrg.subscriptions[0];
    const currentPeriodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;

    return NextResponse.json({
      id: fullOrg.id,
      name: fullOrg.name,
      slug: fullOrg.slug,
      plan: fullOrg.plan,
      logo: fullOrg.logo,
      billingEmail: fullOrg.billingEmail,
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        creditsPerMonth: subscription.creditsPerMonth,
        creditsUsed: subscription.creditsUsed,
        creditsRemaining: subscription.creditsPerMonth - subscription.creditsUsed,
        maxMembers: subscription.maxMembers,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        daysRemaining: currentPeriodEnd ? Math.max(0, Math.ceil((currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
        pricePerMonth: subscription.pricePerMonth,
      } : null,
      members: fullOrg.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      stats: {
        leadCount: fullOrg._count.leads,
        pendingInvites: fullOrg._count.invites,
        memberCount: fullOrg.memberships.length,
      },
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
  }
}

// PATCH: update organization name
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const guard = await requirePermission('settings');
    if (!guard.ok) return guard.response;
    const org = guard.auth.org;

    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim();
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await db.organization.update({
      where: { id: org.id },
      data,
    });

    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}