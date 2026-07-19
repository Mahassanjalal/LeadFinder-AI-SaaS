import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { PLANS } from '@/lib/plans';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const sub = await db.subscription.findFirst({
      where: { orgId: org.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    // Get current month usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const usageRecords = await db.usageRecord.findMany({
      where: {
        orgId: org.id,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Aggregate by type
    const usageByType: Record<string, number> = {};
    for (const r of usageRecords) {
      usageByType[r.type] = (usageByType[r.type] || 0) + r.creditsUsed;
    }

    const plan = PLANS[sub.plan as keyof typeof PLANS];
    const limits = plan?.limits ?? {};

    return NextResponse.json({
      subscription: {
        plan: sub.plan,
        status: sub.status,
        creditsPerMonth: sub.creditsPerMonth,
        creditsUsed: sub.creditsUsed,
        creditsRemaining: sub.creditsPerMonth - sub.creditsUsed,
        maxMembers: sub.maxMembers,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
      usage: usageByType,
      recentRecords: usageRecords,
      limits: {
        discovery: limits.discoveryCreditsPerMonth,
        aiScoring: limits.aiScoringPerMonth,
        aiOutreach: limits.aiOutreachPerMonth,
        exports: limits.exportsPerMonth,
      },
      planDetails: plan ? {
        name: plan.name,
        price: plan.price,
        features: plan.features,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching billing:', error);
    return NextResponse.json({ error: 'Failed to fetch billing info' }, { status: 500 });
  }
}

// POST: Change plan (simulated)
export async function POST(request: NextRequest) {
  try {
    const { plan: newPlan } = await request.json();

    if (!newPlan || !PLANS[newPlan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const planConfig = PLANS[newPlan as keyof typeof PLANS];
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Cancel old subscription, create new one
    await db.subscription.updateMany({
      where: { orgId: org.id, status: 'active' },
      data: { status: 'canceled' },
    });

    const subscription = await db.subscription.create({
      data: {
        orgId: org.id,
        plan: newPlan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        creditsPerMonth: planConfig.creditsPerMonth,
        creditsUsed: 0,
        maxMembers: planConfig.maxMembers,
        pricePerMonth: planConfig.price * 100, // store in cents
      },
    });

    // Update org plan
    await db.organization.update({
      where: { id: org.id },
      data: { plan: newPlan },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        creditsPerMonth: subscription.creditsPerMonth,
        maxMembers: subscription.maxMembers,
        pricePerMonth: subscription.pricePerMonth,
      },
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}