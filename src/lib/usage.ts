import { db } from '@/lib/db';

export async function trackUsage(orgId: string, userId: string, type: string, description?: string, credits = 1) {
  try {
    await db.usageRecord.create({
      data: { orgId, userId, type, description, creditsUsed: credits },
    });

    // Update subscription credits used for current month
    const subscription = await db.subscription.findFirst({
      where: { orgId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (subscription) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { creditsUsed: { increment: credits } },
      });
    }

    return true;
  } catch (error) {
    console.error('Usage tracking error:', error);
    return false;
  }
}

export async function checkCredits(orgId: string, type: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  try {
    const subscription = await db.subscription.findFirst({
      where: { orgId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return { allowed: false, remaining: 0, limit: 0 };
    }

    const remaining = subscription.creditsPerMonth - subscription.creditsUsed;
    const planLimits: Record<string, { field: string; limit: number }> = {
      discovery: { field: 'discoveryCreditsPerMonth', limit: 0 },
      ai_score: { field: 'aiScoringPerMonth', limit: 0 },
      ai_outreach: { field: 'aiOutreachPerMonth', limit: 0 },
      export: { field: 'exportsPerMonth', limit: 0 },
    };

    const config = planLimits[type];
    if (!config) {
      return { allowed: remaining > 0, remaining, limit: subscription.creditsPerMonth };
    }

    // For simplified demo, use overall credits
    // In production, you'd track per-type usage separately
    return { allowed: remaining > 0, remaining, limit: subscription.creditsPerMonth };
  } catch {
    return { allowed: false, remaining: 0, limit: 0 };
  }
}