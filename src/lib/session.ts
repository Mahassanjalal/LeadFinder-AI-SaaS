import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface SessionOrg {
  userId: string;
  orgId: string;
  role: string;
  plan: string;
  email: string;
  name: string | null;
}

// Resolves the authenticated user's organization from the JWT session.
// Returns null when unauthenticated.
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

// Note: routes must resolve their tenant through `requireAuth` /
// `requirePermission` in lib/api-auth.ts (which wraps getSessionOrg above).
// A previous `resolveOrg()` helper silently returned the FIRST organization for
// anonymous requests, leaking tenant data; it has been removed deliberately.
