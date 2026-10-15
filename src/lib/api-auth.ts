import { NextResponse } from 'next/server';
import type { Lead, Organization } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrg, type SessionOrg } from '@/lib/session';
import { hasPermission, type RoleKey } from '@/lib/plans';

// Server-only authorization helpers.
// Do NOT import this module from client components: it pulls in next/server
// and the Prisma client. Client-side feature checks live in auth-helpers.ts.

export interface AuthContext {
  session: SessionOrg;
  org: Organization;
}

export type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse };

function fail(error: string, status: number): AuthResult {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

/**
 * Requires a signed-in user that belongs to an existing organization.
 * Returns 401 otherwise. Previously routes fell back to "the first org in the
 * database" when unauthenticated, which exposed tenant data to anonymous
 * callers; routes must now go through this guard.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getSessionOrg();
  if (!session) {
    return fail('Not authenticated', 401);
  }

  const org = await db.organization.findUnique({ where: { id: session.orgId } });
  if (!org) {
    return fail('Organization not found', 404);
  }

  return { ok: true, auth: { session, org } };
}

/**
 * Requires an authenticated member whose role grants `permission`
 * (see ROLES in lib/plans.ts, e.g. 'leads:write', 'members:invite', 'billing').
 */
export async function requirePermission(permission: string): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  const { session, org } = result.auth;
  if (!hasPermission(session.role as RoleKey, permission)) {
    return fail(
      `Your role (${session.role}) does not have permission to perform this action`,
      403
    );
  }

  return { ok: true, auth: { session, org } };
}

export type LeadAuthResult =
  | { ok: true; auth: AuthContext; lead: Lead }
  | { ok: false; response: NextResponse };

/**
 * Requires `permission` AND a lead that belongs to the caller's organization.
 * Used by nested lead resources (notes, activities) which previously accepted
 * any lead id, crossing tenant boundaries.
 */
export async function requireLead(
  permission: string,
  leadId: string
): Promise<LeadAuthResult> {
  const result = await requirePermission(permission);
  if (!result.ok) return result;

  const lead = await db.lead.findFirst({
    where: { id: leadId, orgId: result.auth.org.id },
  });
  if (!lead) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Lead not found' }, { status: 404 }),
    };
  }

  return { ok: true, auth: result.auth, lead };
}
