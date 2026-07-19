import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth middleware for API routes - uses session token validation
export function apiAuthMiddleware(request: NextRequest) {
  // In production, validate JWT token here
  // For now, check for session header or NextAuth cookie
  const authHeader = request.headers.get('authorization');
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!authHeader && !sessionToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  return null; // Auth check passed
}

// Role-based access check helper
export function hasRoleAccess(userRole: string, requiredPermissions: string[]): boolean {
  const rolePermissions: Record<string, string[]> = {
    owner: ['leads:read', 'leads:write', 'leads:delete', 'ai:score', 'ai:outreach', 'ai:discover', 'ai:insights', 'export', 'analytics', 'crm', 'settings', 'billing', 'members:manage', 'members:invite', 'organization:delete'],
    admin: ['leads:read', 'leads:write', 'leads:delete', 'ai:score', 'ai:outreach', 'ai:discover', 'ai:insights', 'export', 'analytics', 'crm', 'settings', 'members:manage', 'members:invite'],
    analyst: ['leads:read', 'leads:write', 'ai:score', 'ai:outreach', 'ai:discover', 'ai:insights', 'export', 'analytics', 'crm'],
    viewer: ['leads:read', 'analytics'],
  };

  const permissions = rolePermissions[userRole] || [];
  return requiredPermissions.every((p) => permissions.includes(p));
}

// Feature gate check based on subscription plan
export function canUseFeature(plan: string, feature: string): boolean {
  const featureMatrix: Record<string, Record<string, boolean>> = {
    free: {
      kanbanview: false, exportJson: false, crmFeatures: false,
      advancedFilters: false, teamManagement: false, apiAccess: false,
      customAiScoring: false, prioritySupport: false, sso: false,
      discovery: true, aiScoring: true, aiOutreach: true,
      exportCsv: true, tableview: true, cardview: true,
      mapview: true, analyticsView: true,
    },
    starter: {
      discovery: true, aiScoring: true, aiOutreach: true,
      exportCsv: true, exportJson: true, tableview: true, cardview: true,
      kanbanview: true, mapview: true, analyticsView: true,
      crmFeatures: true, advancedFilters: true, teamManagement: true,
      apiAccess: false, customAiScoring: false, prioritySupport: false, sso: false,
    },
    professional: {
      discovery: true, aiScoring: true, aiOutreach: true,
      exportCsv: true, exportJson: true, tableview: true, cardview: true,
      kanbanview: true, mapview: true, analyticsView: true,
      crmFeatures: true, advancedFilters: true, teamManagement: true,
      apiAccess: true, customAiScoring: true, prioritySupport: true, sso: false,
    },
    enterprise: {
      discovery: true, aiScoring: true, aiOutreach: true,
      exportCsv: true, exportJson: true, tableview: true, cardview: true,
      kanbanview: true, mapview: true, analyticsView: true,
      crmFeatures: true, advancedFilters: true, teamManagement: true,
      apiAccess: true, customAiScoring: true, prioritySupport: true, sso: true,
    },
  };

  return featureMatrix[plan]?.[feature] ?? false;
}