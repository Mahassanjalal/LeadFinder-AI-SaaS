import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Organization } from '@prisma/client';

export interface SessionOrg {
  userId: string;
  orgId: string;
  role: string;
  plan: string;
  email: string;
  name: string | null;
}

// Resolves the authenticated user's organization from the JWT session.
// Returns null when unauthenticated. Falls back to the first org only when
// no session exists (demo/seed mode) so the app remains usable without login.
export async function getSessionOrg(): Promise<SessionOrg | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.orgId) return null;

  return {
    userId: session.user.id,
    orgId: session.user.orgId,
    role: session.user.role || 'analyst',
    plan: session.user.orgPlan || 'free',
    email: session.user.email || '',
    name: session.user.name ?? null,
  };
}

// Resolves the org record scoped to the session. In demo mode (no session)
// it returns the first org so seed data stays visible.
export async function resolveOrg(): Promise<Organization | null> {
  const sessionOrg = await getSessionOrg();
  if (sessionOrg) {
    return db.organization.findUnique({ where: { id: sessionOrg.orgId } });
  }
  return db.organization.findFirst();
}
