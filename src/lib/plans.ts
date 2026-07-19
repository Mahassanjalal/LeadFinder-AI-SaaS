// ============================================
// Subscription Plans Configuration
// ============================================

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: 'forever',
    description: 'Get started with lead discovery',
    creditsPerMonth: 50,
    maxMembers: 1,
    maxLeads: 100,
    features: {
      discovery: true,
      aiScoring: true,
      aiOutreach: true,
      exportCsv: true,
      exportJson: false,
      tableview: true,
      cardview: true,
      kanbanview: false,
      mapview: true,
      analyticsView: true,
      crmFeatures: false,
      advancedFilters: false,
      teamManagement: false,
      apiAccess: false,
      customAiScoring: false,
      prioritySupport: false,
      sso: false,
    },
    limits: {
      aiScoringPerMonth: 10,
      aiOutreachPerMonth: 10,
      exportsPerMonth: 10,
      discoveryCreditsPerMonth: 50,
    },
    highlight: false,
  },
  starter: {
    name: 'Starter',
    price: 29,
    priceLabel: '$29',
    period: '/user/mo',
    description: 'For individual analysts growing their pipeline',
    creditsPerMonth: 500,
    maxMembers: 3,
    maxLeads: 2000,
    features: {
      discovery: true,
      aiScoring: true,
      aiOutreach: true,
      exportCsv: true,
      exportJson: true,
      tableview: true,
      cardview: true,
      kanbanview: true,
      mapview: true,
      analyticsView: true,
      crmFeatures: true,
      advancedFilters: true,
      teamManagement: true,
      apiAccess: false,
      customAiScoring: false,
      prioritySupport: false,
      sso: false,
    },
    limits: {
      aiScoringPerMonth: 100,
      aiOutreachPerMonth: 100,
      exportsPerMonth: 100,
      discoveryCreditsPerMonth: 500,
    },
    highlight: false,
  },
  professional: {
    name: 'Professional',
    price: 79,
    priceLabel: '$79',
    period: '/user/mo',
    description: 'For teams that need full sales intelligence',
    creditsPerMonth: 2000,
    maxMembers: 10,
    maxLeads: 10000,
    features: {
      discovery: true,
      aiScoring: true,
      aiOutreach: true,
      exportCsv: true,
      exportJson: true,
      tableview: true,
      cardview: true,
      kanbanview: true,
      mapview: true,
      analyticsView: true,
      crmFeatures: true,
      advancedFilters: true,
      teamManagement: true,
      apiAccess: true,
      customAiScoring: true,
      prioritySupport: true,
      sso: false,
    },
    limits: {
      aiScoringPerMonth: 1000,
      aiOutreachPerMonth: 500,
      exportsPerMonth: -1, // unlimited
      discoveryCreditsPerMonth: 2000,
    },
    highlight: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    priceLabel: '$199',
    period: '/user/mo',
    description: 'For organizations with advanced needs',
    creditsPerMonth: 10000,
    maxMembers: 50,
    maxLeads: 100000,
    features: {
      discovery: true,
      aiScoring: true,
      aiOutreach: true,
      exportCsv: true,
      exportJson: true,
      tableview: true,
      cardview: true,
      kanbanview: true,
      mapview: true,
      analyticsView: true,
      crmFeatures: true,
      advancedFilters: true,
      teamManagement: true,
      apiAccess: true,
      customAiScoring: true,
      prioritySupport: true,
      sso: true,
    },
    limits: {
      aiScoringPerMonth: -1, // unlimited
      aiOutreachPerMonth: -1,
      exportsPerMonth: -1,
      discoveryCreditsPerMonth: 10000,
    },
    highlight: false,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ============================================
// Role Permissions
// ============================================

export const ROLES = {
  owner: {
    label: 'Owner',
    description: 'Full access including billing and organization settings',
    permissions: ['leads:read', 'leads:write', 'leads:delete', 'ai:score', 'ai:outreach', 'ai:discover', 'ai:insights', 'export', 'analytics', 'crm', 'settings', 'billing', 'members:manage', 'members:invite', 'organization:delete'],
    canChangeRole: true,
  },
  admin: {
    label: 'Admin',
    description: 'Manage team members and all app features',
    permissions: ['leads:read', 'leads:write', 'leads:delete', 'ai:score', 'ai:outreach', 'ai:discover', 'ai:insights', 'export', 'analytics', 'crm', 'settings', 'members:manage', 'members:invite'],
    canChangeRole: true,
  },
  analyst: {
    label: 'Analyst',
    description: 'Full lead management and AI features',
    permissions: ['leads:read', 'leads:write', 'ai:score', 'ai:outreach', 'ai:discover', 'ai:insights', 'export', 'analytics', 'crm'],
    canChangeRole: false,
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to leads and analytics',
    permissions: ['leads:read', 'analytics'],
    canChangeRole: false,
  },
} as const;

export type RoleKey = keyof typeof ROLES;

export function hasPermission(role: RoleKey, permission: string): boolean {
  return ROLES[role]?.permissions.includes(permission as never) ?? false;
}

export function canAccessFeature(plan: PlanKey, feature: string): boolean {
  return PLANS[plan]?.features[feature as keyof typeof PLANS[PlanKey]['features']] ?? false;
}