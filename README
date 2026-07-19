# LeadFinder AI — SaaS Development Plan

## Project Summary

A **SaaS platform** for AI-powered lead discovery, scoring, and outreach, built for data analysts and sales teams. Features subscription-based pricing, role-based access control, multi-organization support, and credit-based usage tracking.

> **Architecture**: Next.js 16 App Router SPA on `/` with client-side view routing. Authentication via NextAuth.js (JWT strategy). Organization-scoped data isolation via Prisma (SQLite). Premium glassmorphism UI with dark/light themes.

---

## Market Research Summary

### Competitive Landscape
| Competitor | Price Range | Model | Key Differentiator |
|---|---|---|---|
| **Apollo.io** | $49-119/user/mo | Seat + Credit | 600K+ company database, dominant market share |
| **Hunter.io** | $34-199/mo | Seat + Credit | Email-focused, $0.014/credit |
| **Lusha** | $36-122/user/mo | Seat + Credit | Phone numbers, data enrichment |
| **ZoomInfo** | $15K-60K+/yr | Enterprise | B2B intelligence, intent data |
| **Clay** | $185-749/mo | Flat rate | Workflow automation, dual-credit |
| **Seamless.ai** | $65-185/user/mo | Seat + Credit | Real-time search engine |

### Industry Pricing Consensus
- **Hybrid seat + credit model** is standard (every competitor charges per-seat)
- **Export is the #1 conversion trigger** (free users can search but NOT download)
- **CRM integrations** are the #2 upgrade driver
- **Annual billing** offers 15-30% discount industry-wide
- **AI scoring** is typically reserved for mid/high tiers (our differentiator: included in all plans)

### LeadFinder AI Pricing Strategy
Our pricing is positioned **below Apollo and Clay** while offering **AI scoring and outreach at lower tiers** — a gap in the market.

---

## Subscription Plans

| Feature | Free | Starter ($29/mo) | Professional ($79/mo) | Enterprise ($199/mo) |
|---|---|---|---|---|
| **Discovery credits/mo** | 50 | 500 | 2,000 | 10,000 |
| **Team members** | 1 | 3 | 10 | 50 |
| **Max leads** | 100 | 2,000 | 10,000 | 100,000 |
| **AI scoring/mo** | 10 | 100 | 1,000 | Unlimited |
| **AI outreach/mo** | 10 | 100 | 500 | Unlimited |
| **Exports/mo** | 10 | 100 | Unlimited | Unlimited |
| Table view | ✅ | ✅ | ✅ | ✅ |
| Card view | ✅ | ✅ | ✅ | ✅ |
| Kanban board | ❌ | ✅ | ✅ | ✅ |
| CRM features | ❌ | ✅ | ✅ | ✅ |
| Advanced filters | ❌ | ✅ | ✅ | ✅ |
| JSON export | ❌ | ✅ | ✅ | ✅ |
| API access | ❌ | ❌ | ✅ | ✅ |
| Custom AI scoring | ❌ | ❌ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ | ✅ |
| SSO | ❌ | ❌ | ❌ | ✅ |

---

## Role-Based Access Control

| Permission | Owner | Admin | Analyst | Viewer |
|---|---|---|---|---|
| View leads | ✅ | ✅ | ✅ | ✅ |
| Create / Edit leads | ✅ | ✅ | ✅ | ❌ |
| Delete leads | ✅ | ✅ | ❌ | ❌ |
| AI scoring & outreach | ✅ | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ✅ | ❌ |
| Manage team | ✅ | ✅ | ❌ | ❌ |
| Billing & plans | ✅ | ❌ | ❌ | ❌ |
| Analytics & reports | ✅ | ✅ | ✅ | ✅ |

---

## Phase 1 — Foundation (Original + SaaS Extension)

### 1.1 Database Schema (Prisma / SQLite)
**Auth Models:**
- `User` — id, name, email, password (bcrypt), image, emailVerified
- `Account` — OAuth provider accounts (NextAuth compatible)
- `Session` — JWT session management
- `VerificationToken` — email verification tokens

**Organization & Subscription Models:**
- `Organization` — id, name, slug, ownerId, plan, billingEmail, logo
- `Membership` — userId, orgId, role (owner/admin/analyst/viewer)
- `Subscription` — orgId, plan, status, creditsPerMonth, creditsUsed, maxMembers, pricePerMonth, period
- `UsageRecord` — orgId, userId, type, description, creditsUsed
- `Invite` — orgId, email, role, token, invitedBy, expiresAt

**Lead & CRM Models:**
- `Lead` — all original fields + orgId, assignedTo, createdBy (org-scoped)
- `Note` — content, leadId, authorId
- `Activity` — type, title, description, leadId, userId

### 1.2 State Management (Zustand)
- `useAppStore` — active view, auth state (isAuthenticated, authView, userRole, userPlan), sidebar, search
- `useLeadStore` — leads, filters, sort, view mode (client-side filtering)
- Auth state synced from NextAuth session

### 1.3 Seed Data
- 3 demo users (Owner, Analyst, Viewer)
- 1 organization: "DataFlow Analytics" (Professional plan)
- 1 active subscription (2000 credits/mo, 247 used)
- 7 usage records
- 29 realistic leads across industries with AI scores, notes, activities

---

## Phase 2 — API Layer (Original + SaaS Extensions)

### 2.1 Authentication
- `GET/POST /api/auth/[...nextauth]` — NextAuth.js handlers (credentials provider)
- `POST /api/auth/register` — User registration (creates user + org + membership + subscription)

### 2.2 Organization & Billing
- `GET /api/organizations` — Current org info, members, stats
- `GET /api/billing` — Subscription details, usage breakdown, credit balance, limits
- `POST /api/billing` — Plan change (simulated — in production: Stripe integration)

### 2.3 Lead CRUD (org-scoped)
- `GET /api/leads` — list (filtered by orgId)
- `GET /api/leads/[id]` — single lead detail
- `POST /api/leads` — create (auto-assigned to org)
- `PATCH /api/leads/[id]` — update
- `DELETE /api/leads/[id]` — remove

### 2.4 AI Features
- `POST /api/ai/score` — score/re-score a lead
- `POST /api/ai/insights` — generate business insights
- `POST /api/ai/outreach` — generate cold outreach messages
- `POST /api/ai/discover` — discover businesses by location
- `POST /api/ai/recommendations` — get AI recommendations

### 2.5 Analytics & Export (org-scoped)
- `GET /api/analytics` — comprehensive analytics (KPIs, distributions, trends)
- `GET /api/export` — CSV/JSON export with plan-based gating

---

## Phase 3 — UI Components

### 3.1 Auth Pages (SPA views, no separate routes)
- **Landing Page** — Hero section, feature grid (6 cards), social proof, CTA, pricing teaser
- **Login Form** — Email/password + "Try Demo Account" button, password visibility toggle
- **Register Form** — Name, email, password, org name, free plan feature preview

### 3.2 Layout Shell (authenticated)
- **Sidebar** — Nav items with feature gating (PRO badges on locked features), plan badge, Settings nav item
- **Header** — Real user info from session, plan badge, role badge, sign out, upgrade CTA, export with plan gating

### 3.3 Settings View (3 tabs)
- **Profile Tab** — Personal info, org details, danger zone (sign out)
- **Billing Tab** — Credit usage progress bar, per-feature usage breakdown, plan switcher (4 plan cards), usage history, upgrade prompts
- **Team Tab** — Member list with role dropdowns, invite button, member limit warning, role permissions reference table

### 3.4 Feature Gating
- Sidebar nav items show "PRO" badge for locked features
- Export dropdown disables JSON export on free plan
- Kanban view locked on free plan
- CRM features locked on free plan
- All gating uses `canUseFeature(plan, feature)` helper

---

## Phase 4 — Polish & UX (Original + SaaS)

### 4.1 SaaS-Specific UX
- Auth flow: Landing → Login/Register → Dashboard
- Session persistence via NextAuth JWT (30-day expiry)
- Plan badge in header and sidebar
- Upgrade prompts in feature-gated areas
- Settings accessible via sidebar nav + user menu

### 4.2 Design System
- Premium glassmorphism cards
- Gradient accents (emerald/teal primary, amber accent)
- Dark/light theme support via next-themes
- Consistent spacing & typography

### 4.3 Animations (Framer Motion)
- Auth page transitions (fade between landing/login/register)
- Page/tab transitions (fade + slide)
- Staggered card entry animations
- Animated KPI counters
- Score ring animations

---

## File Structure (Updated)

```
src/
├── app/
│   ├── layout.tsx              # Root layout (theme, fonts, toaster)
│   ├── page.tsx                # SPA entry: SessionProvider + auth routing + AppShell
│   ├── globals.css             # Tailwind + glassmorphism + animations
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts   # NextAuth.js handlers
│       │   └── register/route.ts        # User registration
│       ├── leads/
│       │   ├── route.ts                 # GET list (org-scoped), POST create
│       │   └── [id]/
│       │       ├── route.ts             # GET/PATCH/DELETE
│       │       ├── notes/route.ts       # Notes CRUD
│       │       └── activities/route.ts  # Activity CRUD
│       ├── ai/
│       │   ├── score/route.ts
│       │   ├── insights/route.ts
│       │   ├── outreach/route.ts
│       │   ├── discover/route.ts
│       │   └── recommendations/route.ts
│       ├── analytics/route.ts          # Org-scoped analytics
│       ├── billing/route.ts            # GET billing info, POST plan change
│       ├── organizations/route.ts      # GET org details + members
│       └── export/route.ts             # CSV/JSON with plan gating
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── auth/
│   │   └── auth-page.tsx        # Landing, Login, Register (SPA views)
│   ├── settings/
│   │   └── settings-view.tsx    # Profile, Billing, Team tabs
│   ├── layout/
│   │   ├── app-shell.tsx        # Main layout wrapper
│   │   ├── sidebar.tsx          # Nav with feature gating + plan badge
│   │   └── header.tsx           # User menu, plan badge, sign out
│   ├── leads/                   # (all original components)
│   ├── outreach/                # (original)
│   ├── dashboard/               # (original)
│   ├── crm/                     # (original)
│   └── shared/                  # (original)
├── stores/
│   ├── app-store.ts             # Extended: auth state + settings view
│   └── lead-store.ts            # (original)
├── lib/
│   ├── db.ts                    # Prisma client (no query log in prod)
│   ├── auth.ts                  # NextAuth configuration
│   ├── auth-helpers.ts          # Role/feature gating utilities
│   ├── plans.ts                 # Plan definitions, roles, permissions
│   ├── usage.ts                 # Credit tracking + limit checking
│   ├── types.ts                 # Extended: auth/SaaS types
│   ├── utils.ts                 # cn() utility
│   └── ai-client.ts             # (original)
└── hooks/
    ├── use-mobile.ts
    └── use-toast.ts
```

---

## Demo Accounts

| Role | Email | Password | Access |
|---|---|---|---|
| **Owner** | admin@leadfinder.ai | demo1234 | Full access including billing |
| **Analyst** | analyst@leadfinder.ai | demo1234 | Leads, AI, export — no billing |
| **Viewer** | viewer@leadfinder.ai | demo1234 | Read-only leads + analytics |

**Organization**: DataFlow Analytics — Professional plan, 2000 credits/mo, 3 members

---

## Production Deployment Notes

### Required Integrations (for real deployment)
1. **Stripe** — Payment processing for plan subscriptions
2. **Email provider** (SendGrid/Resend) — Email verification, password reset, team invites
3. **OAuth providers** — Google/GitHub for social login
4. **Database migration** — PostgreSQL for production (replace SQLite)

### Security Considerations
- Change `NEXTAUTH_SECRET` in production
- Enable CORS restrictions
- Add rate limiting on auth endpoints
- Implement email verification flow
- Add password reset functionality
- Consider SSO (SAML/OIDC) for Enterprise plan