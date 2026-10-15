import { db } from '@/lib/db';
import { PLANS } from '@/lib/plans';

// UsageRecord.userId is a required foreign key, so every record must reference
// a real user. Callers used to pass the literal 'system', which made Prisma
// throw a foreign-key error that was swallowed below — meaning NO usage was ever
// recorded and credit/limit enforcement silently never worked.
// Resolves: the acting user (if they belong to the org) → org owner → any member.
async function resolveUsageUser(orgId: string, userId?: string | null): Promise<string | null> {
  if (userId) {
    const membership = await db.membership.findFirst({ where: { orgId, userId } });
    if (membership) return membership.userId;
  }
  const owner = await db.membership.findFirst({ where: { orgId, role: 'owner' } });
  if (owner) return owner.userId;
  const member = await db.membership.findFirst({ where: { orgId } });
  if (member) return member.userId;
  const user = await db.user.findFirst();
  return user?.id ?? null;
}

export async function trackUsage(orgId: string, userId: string | null | undefined, type: string, description?: string, credits = 1) {
  try {
    const resolvedUserId = await resolveUsageUser(orgId, userId);
    if (!resolvedUserId) {
      console.warn(`Usage not recorded for org ${orgId}: no user available to attribute "${type}" to.`);
      return false;
    }

    await db.usageRecord.create({
      data: { orgId, userId: resolvedUserId, type, description, creditsUsed: credits },
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

// Per-feature monthly limit enforcement based on the active plan's limits.
// Returns { allowed, remaining, limit } where limit === -1 means unlimited.
export async function checkLimit(orgId: string, type: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  try {
    const subscription = await db.subscription.findFirst({
      where: { orgId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return { allowed: false, remaining: 0, limit: 0 };
    }

    const limitFields: Record<string, string> = {
      discovery: 'discoveryCreditsPerMonth',
      ai_score: 'aiScoringPerMonth',
      ai_outreach: 'aiOutreachPerMonth',
      ai_insights: 'aiScoringPerMonth',
      export: 'exportsPerMonth',
    };

    const plan = PLANS[subscription.plan as keyof typeof PLANS];
    const limitField = limitFields[type];
    const limit = limitField && plan ? (plan.limits as Record<string, number>)[limitField] : -1;

    // -1 (or missing) means unlimited
    if (limit === -1 || limit == null) {
      const remainingCredits = subscription.creditsPerMonth - subscription.creditsUsed;
      return { allowed: remainingCredits > 0, remaining: remainingCredits, limit: -1 };
    }

    // Count usage of this type in the current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const used = await db.usageRecord.count({
      where: {
        orgId,
        type,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    });

    const remaining = limit - used;
    return { allowed: remaining > 0, remaining, limit };
  } catch {
    return { allowed: false, remaining: 0, limit: 0 };
  }
}