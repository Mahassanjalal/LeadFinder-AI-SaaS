import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET current user's organization + subscription info
export async function GET() {
  try {
    // In a real app, get user ID from session
    // For demo, return the first org
    const org = await db.organization.findFirst({
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

    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const subscription = org.subscriptions[0];
    const currentPeriodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      logo: org.logo,
      billingEmail: org.billingEmail,
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
      members: org.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      stats: {
        leadCount: org._count.leads,
        pendingInvites: org._count.invites,
        memberCount: org.memberships.length,
      },
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
  }
}