export interface Lead {
  id: string;
  companyName: string;
  industry: string;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  linkedinUrl: string | null;
  companySize: string | null;
  estimatedRevenue: string | null;
  employeeCount: number | null;
  googleRating: number | null;
  reviewCount: number | null;
  yearsInBusiness: number | null;
  businessCategory: string | null;
  decisionMaker: string | null;
  decisionMakerTitle: string | null;
  latitude: number | null;
  longitude: number | null;
  leadScore: number;
  digitalMaturity: number | null;
  growthPotential: number | null;
  operationalComplexity: number | null;
  dataVolumeIndicators: number | null;
  marketingSophistication: number | null;
  confidenceScore: number | null;
  urgencyScore: number | null;
  estimatedProjectValue: string | null;
  businessSummary: string | null;
  painPoints: string | null; // JSON string array
  analyticsOpportunities: string | null; // JSON string array
  recommendedServices: string | null; // JSON string array
  aiInsights: string | null; // JSON object
  potentialROI: string | null;
  outreachRecommendations: string | null; // JSON string array
  pipelineStage: string;
  isFavorite: boolean;
  outreachStatus: string;
  tags: string | null; // JSON string array
  createdAt: string;
  updatedAt: string;
  notes?: Note[];
  activities?: Activity[];
}

export interface Note {
  id: string;
  content: string;
  leadId: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  leadId: string;
  createdAt: string;
}

export type ViewMode = 'table' | 'cards' | 'kanban' | 'map' | 'analytics';
export type AppView = 'discovery' | 'leads' | 'outreach' | 'analytics' | 'crm' | 'settings';
export type AuthView = 'landing' | 'login' | 'register';

// ============================================
// Auth & SaaS Types
// ============================================

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  orgId?: string;
  orgSlug?: string;
  orgName?: string;
  orgPlan?: string;
  role?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo?: string | null;
  billingEmail?: string | null;
  subscription: {
    plan: string;
    status: string;
    creditsPerMonth: number;
    creditsUsed: number;
    creditsRemaining: number;
    maxMembers: number;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    daysRemaining: number | null;
    pricePerMonth: number;
  } | null;
  members: {
    id: string;
    role: string;
    joinedAt: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  }[];
  stats: {
    leadCount: number;
    pendingInvites: number;
    memberCount: number;
  };
}

export interface SubscriptionPlan {
  name: string;
  price: number;
  priceLabel: string;
  period: string;
  description: string;
  creditsPerMonth: number;
  maxMembers: number;
  maxLeads: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  highlight: boolean;
}

export interface UsageData {
  subscription: {
    plan: string;
    status: string;
    creditsPerMonth: number;
    creditsUsed: number;
    creditsRemaining: number;
    maxMembers: number;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  };
  usage: Record<string, number>;
  recentRecords: {
    id: string;
    type: string;
    description: string | null;
    creditsUsed: number;
    createdAt: string;
    user: { name: string | null; email: string } | null;
  }[];
  limits: Record<string, number>;
  planDetails: {
    name: string;
    price: number;
    features: Record<string, boolean>;
  } | null;
}

export type ScoreCategory = 'excellent' | 'high' | 'moderate' | 'low' | 'poor';

export function getScoreCategory(score: number): ScoreCategory {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'high';
  if (score >= 60) return 'moderate';
  if (score >= 40) return 'low';
  return 'poor';
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-amber-500';
  if (score >= 75) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-sky-500';
  return 'text-gray-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-amber-500/10 border-amber-500/20';
  if (score >= 75) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
  if (score >= 40) return 'bg-sky-500/10 border-sky-500/20';
  return 'bg-gray-500/10 border-gray-500/20';
}

export function parseJsonField<T>(field: string | null, fallback: T): T {
  if (!field) return fallback;
  try {
    return JSON.parse(field);
  } catch {
    return fallback;
  }
}

export interface LeadFilters {
  search: string;
  industry: string;
  companySize: string;
  minScore: number;
  maxScore: number;
  pipelineStage: string;
  outreachStatus: string;
  isFavorite: boolean | null;
  minEmployees: number;
  maxEmployees: number;
  minRating: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const defaultFilters: LeadFilters = {
  search: '',
  industry: '',
  companySize: '',
  minScore: 0,
  maxScore: 100,
  pipelineStage: '',
  outreachStatus: '',
  isFavorite: null,
  minEmployees: 0,
  maxEmployees: 99999,
  minRating: 0,
  sortBy: 'leadScore',
  sortOrder: 'desc',
};

export const PIPELINE_STAGES = ['New', 'Contacted', 'Replied', 'Meeting Set', 'Proposal Sent', 'Won', 'Lost'] as const;
export const OUTREACH_STATUSES = ['Not Contacted', 'Contacted', 'Replied', 'Meeting Set', 'Proposal Sent', 'Won', 'Lost'] as const;
export const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Logistics', 'Food & Beverage', 'Professional Services', 'Marketing', 'Construction', 'Legal', 'Travel', 'Media'] as const;
export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

export interface OutreachMessage {
  type: 'cold_email' | 'linkedin_connection' | 'linkedin_message' | 'follow_up_email' | 'proposal_intro' | 'call_script';
  subject?: string;
  body: string;
}

export interface AnalyticsData {
  totalLeads: number;
  avgScore: number;
  totalPipelineValue: number;
  conversionRate: number;
  scoreDistribution: { range: string; count: number }[];
  industryBreakdown: { industry: string; count: number; avgScore: number }[];
  pipelineData: { stage: string; count: number }[];
  outreachPerformance: { month: string; sent: number; replied: number; converted: number }[];
  topOpportunities: { name: string; score: number; value: string; industry: string }[];
}