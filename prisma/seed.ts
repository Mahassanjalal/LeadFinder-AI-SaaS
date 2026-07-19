import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ============================================
  // 1. Create Demo User
  // ============================================
  const hashedPassword = await bcrypt.hash("demo1234", 12);

  const demoUser = await prisma.user.upsert({
    where: { email: "admin@leadfinder.ai" },
    update: {},
    create: {
      name: "Sarah Chen",
      email: "admin@leadfinder.ai",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  const analystUser = await prisma.user.upsert({
    where: { email: "analyst@leadfinder.ai" },
    update: {},
    create: {
      name: "Mike Rodriguez",
      email: "analyst@leadfinder.ai",
      password: await bcrypt.hash("demo1234", 12),
      emailVerified: new Date(),
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { email: "viewer@leadfinder.ai" },
    update: {},
    create: {
      name: "Emily Park",
      email: "viewer@leadfinder.ai",
      password: await bcrypt.hash("demo1234", 12),
      emailVerified: new Date(),
    },
  });

  console.log("✅ Created demo users:", demoUser.email, analystUser.email, viewerUser.email);

  // ============================================
  // 2. Create Organization
  // ============================================
  const org = await prisma.organization.upsert({
    where: { slug: "dataflow-analytics" },
    update: {},
    create: {
      name: "DataFlow Analytics",
      slug: "dataflow-analytics",
      ownerId: demoUser.id,
      billingEmail: "admin@leadfinder.ai",
      plan: "professional",
    },
  });

  console.log("✅ Created organization:", org.name);

  // ============================================
  // 3. Create Memberships
  // ============================================
  await prisma.membership.upsert({
    where: { id: `${demoUser.id}-${org.id}` },
    update: {},
    create: { userId: demoUser.id, orgId: org.id, role: "owner" },
  });

  await prisma.membership.upsert({
    where: { id: `${analystUser.id}-${org.id}` },
    update: {},
    create: { userId: analystUser.id, orgId: org.id, role: "analyst", invitedBy: demoUser.id },
  });

  await prisma.membership.upsert({
    where: { id: `${viewerUser.id}-${org.id}` },
    update: {},
    create: { userId: viewerUser.id, orgId: org.id, role: "viewer", invitedBy: demoUser.id },
  });

  console.log("✅ Created memberships (3 members)");

  // ============================================
  // 4. Create Subscription
  // ============================================
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  await prisma.subscription.upsert({
    where: { id: `sub-${org.id}` },
    update: {},
    create: {
      orgId: org.id,
      plan: "professional",
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      creditsPerMonth: 2000,
      creditsUsed: 247,
      maxMembers: 10,
      pricePerMonth: 7900,
    },
  });

  console.log("✅ Created professional subscription (2000 credits/mo)");

  // ============================================
  // 5. Create some usage records
  // ============================================
  const usageTypes = [
    { type: "discovery", desc: "Discovered 5 businesses in New York", credits: 5 },
    { type: "ai_score", desc: "Scored NexaBridge Solutions", credits: 1 },
    { type: "ai_outreach", desc: "Generated cold email for TechFlow Inc", credits: 1 },
    { type: "export", desc: "Exported 30 leads as CSV", credits: 1 },
    { type: "discovery", desc: "Discovered 8 businesses in San Francisco", credits: 8 },
    { type: "ai_score", desc: "Batch scored 10 leads", credits: 10 },
    { type: "ai_outreach", desc: "Generated LinkedIn message for DataVista", credits: 1 },
  ];

  for (const u of usageTypes) {
    await prisma.usageRecord.create({
      data: {
        orgId: org.id,
        userId: demoUser.id,
        type: u.type,
        description: u.desc,
        creditsUsed: u.credits,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("✅ Created 7 usage records");

  // ============================================
  // 6. Seed Leads (same 30 leads as before)
  // ============================================
  interface SeedLead {
    companyName: string; industry: string; website: string; address: string;
    city: string; state: string; country: string; postalCode: string;
    phone: string; email: string; linkedinUrl: string; companySize: string;
    estimatedRevenue: string; employeeCount: number; googleRating: number;
    reviewCount: number; yearsInBusiness: number; businessCategory: string;
    decisionMaker: string; decisionMakerTitle: string; latitude: number;
    longitude: number; leadScore: number; digitalMaturity: number;
    growthPotential: number; operationalComplexity: number;
    dataVolumeIndicators: number; marketingSophistication: number;
    confidenceScore: number; urgencyScore: number;
    estimatedProjectValue: string; businessSummary: string;
    painPoints: string; analyticsOpportunities: string;
    recommendedServices: string; aiInsights: string;
    pipelineStage: string; isFavorite: boolean; outreachStatus: string;
    tags: string;
    notes: { content: string }[];
    activities: { type: string; title: string; description: string }[];
  }

  const leads: SeedLead[] = [
    {
      companyName: "NexaBridge Solutions", industry: "Technology", website: "https://nexabridge.io",
      address: "350 5th Ave, Suite 4200", city: "New York", state: "NY", country: "US", postalCode: "10118",
      phone: "+1 (212) 555-0142", email: "info@nexabridge.io", linkedinUrl: "https://linkedin.com/company/nexabridge",
      companySize: "201-500", estimatedRevenue: "$25M - $50M", employeeCount: 320, googleRating: 4.7,
      reviewCount: 89, yearsInBusiness: 8, businessCategory: "SaaS Platform",
      decisionMaker: "Jennifer Walsh", decisionMakerTitle: "VP of Operations",
      latitude: 40.7484, longitude: -73.9857, leadScore: 95,
      digitalMaturity: 92, growthPotential: 88, operationalComplexity: 85,
      dataVolumeIndicators: 90, marketingSophistication: 87,
      confidenceScore: 94, urgencyScore: 82, estimatedProjectValue: "$15,000 - $25,000",
      businessSummary: "NexaBridge is a fast-growing SaaS platform helping mid-market companies integrate and analyze data across multiple business systems. They process over 10TB of data monthly and are rapidly expanding their analytics capabilities.",
      painPoints: JSON.stringify(["Data silos across 12+ departments", "Manual reporting consuming 20+ hours/week", "Difficulty scaling analytics as data volume grows 40% YoY"]),
      analyticsOpportunities: JSON.stringify(["Automated executive dashboards", "Customer behavior analytics pipeline", "Real-time operational metrics", "Predictive churn modeling"]),
      recommendedServices: JSON.stringify(["Data pipeline architecture", "Executive dashboard suite", "Automated reporting system", "Data warehouse optimization"]),
      aiInsights: JSON.stringify({"summary": "Prime prospect with urgent analytics needs and budget approval", "bestApproach": "Lead with ROI-focused case study showing similar company results", "riskLevel": "low"}),
      pipelineStage: "Meeting Set", isFavorite: true, outreachStatus: "Meeting Set",
      tags: JSON.stringify(["SaaS", "high-value", "hot-lead"]),
      notes: [{ content: "Met Jennifer at DataCon 2026 — very interested in dashboard solutions. Follow up with proposal by Friday." }],
      activities: [{ type: "email", title: "Sent introduction email", description: "Personalized cold email with industry insights" }, { type: "call", title: "Discovery call completed", description: "45 min call — identified key pain points and budget range" }],
    },
    {
      companyName: "MedTech Analytics Corp", industry: "Healthcare", website: "https://medtechanalytics.com",
      address: "2000 Pennsylvania Ave NW", city: "Washington", state: "DC", country: "US", postalCode: "20006",
      phone: "+1 (202) 555-0198", email: "contact@medtechanalytics.com", linkedinUrl: "https://linkedin.com/company/medtech-analytics",
      companySize: "201-500", estimatedRevenue: "$50M - $100M", employeeCount: 410, googleRating: 4.5,
      reviewCount: 56, yearsInBusiness: 12, businessCategory: "Healthcare Analytics",
      decisionMaker: "Dr. Robert Kim", decisionMakerTitle: "Chief Data Officer",
      latitude: 38.8977, longitude: -77.0365, leadScore: 91,
      digitalMaturity: 88, growthPotential: 85, operationalComplexity: 92,
      dataVolumeIndicators: 95, marketingSophistication: 78,
      confidenceScore: 90, urgencyScore: 88, estimatedProjectValue: "$25,000 - $40,000",
      businessSummary: "MedTech Analytics provides data-driven insights for healthcare organizations, processing patient data, clinical trial results, and operational metrics for 200+ hospital networks.",
      painPoints: JSON.stringify(["HIPAA compliance adding complexity to data workflows", "Need for real-time patient flow analytics", "Manual ETL processes causing 2-day reporting delays"]),
      analyticsOpportunities: JSON.stringify(["Compliant data pipeline architecture", "Patient flow optimization dashboard", "Automated regulatory reporting", "Clinical trial data analytics"]),
      recommendedServices: JSON.stringify(["HIPAA-compliant data platform", "Healthcare KPI dashboards", "Automated compliance reporting", "Data governance framework"]),
      aiInsights: JSON.stringify({"summary": "High-value healthcare prospect with compliance-critical needs", "bestApproach": "Emphasize HIPAA expertise and healthcare-specific case studies", "riskLevel": "low"}),
      pipelineStage: "Proposal Sent", isFavorite: true, outreachStatus: "Proposal Sent",
      tags: JSON.stringify(["healthcare", "compliance", "enterprise"]),
      notes: [{ content: "Proposal sent for $35K engagement. Decision expected by end of month. Dr. Kim mentioned they need HIPAA-certified solutions." }],
      activities: [{ type: "proposal", title: "Sent $35K proposal", description: "Comprehensive data analytics platform proposal" }, { type: "email", title: "Follow-up email sent", description: "Checked in on proposal review status" }],
    },
    {
      companyName: "GreenLeaf Retail Group", industry: "Retail", website: "https://greenleafretail.com",
      address: "890 N Michigan Ave", city: "Chicago", state: "IL", country: "US", postalCode: "60611",
      phone: "+1 (312) 555-0234", email: "data@greenleafretail.com", linkedinUrl: "https://linkedin.com/company/greenleaf-retail",
      companySize: "51-200", estimatedRevenue: "$10M - $25M", employeeCount: 145, googleRating: 4.2,
      reviewCount: 34, yearsInBusiness: 6, businessCategory: "Retail Chain",
      decisionMaker: "Amanda Torres", decisionMakerTitle: "Director of Marketing",
      latitude: 41.9009, longitude: -87.6237, leadScore: 78,
      digitalMaturity: 72, growthPotential: 80, operationalComplexity: 68,
      dataVolumeIndicators: 75, marketingSophistication: 82,
      confidenceScore: 76, urgencyScore: 65, estimatedProjectValue: "$8,000 - $15,000",
      businessSummary: "GreenLeaf Retail operates 28 sustainable product stores across the Midwest, with growing e-commerce operations generating significant customer behavior data.",
      painPoints: JSON.stringify(["No unified view of in-store and online customer data", "Inventory forecasting relies on manual spreadsheets", "Marketing ROI difficult to attribute across channels"]),
      analyticsOpportunities: JSON.stringify(["Omnichannel customer analytics", "Demand forecasting model", "Marketing attribution dashboard", "Customer segmentation engine"]),
      recommendedServices: JSON.stringify(["Customer data platform", "Sales forecasting", "Marketing analytics dashboard", "Inventory optimization"]),
      aiInsights: JSON.stringify({"summary": "Growing retailer with clear analytics gap in omnichannel", "bestApproach": "Focus on revenue uplift from unified customer view", "riskLevel": "medium"}),
      pipelineStage: "Replied", isFavorite: false, outreachStatus: "Replied",
      tags: JSON.stringify(["retail", "ecommerce", "mid-market"]),
      notes: [], activities: [{ type: "email", title: "Sent cold email", description: "Initial outreach with retail analytics case study" }, { type: "reply", title: "Received positive reply", description: "Amanda interested in learning more about customer analytics" }],
    },
    {
      companyName: "FinanceHub Capital", industry: "Finance", website: "https://financehubcap.com",
      address: "1 Financial Plaza, Floor 35", city: "Charlotte", state: "NC", country: "US", postalCode: "28202",
      phone: "+1 (704) 555-0167", email: "ops@financehubcap.com", linkedinUrl: "https://linkedin.com/company/financehub-capital",
      companySize: "51-200", estimatedRevenue: "$50M - $100M", employeeCount: 180, googleRating: 4.4,
      reviewCount: 42, yearsInBusiness: 15, businessCategory: "Financial Services",
      decisionMaker: "Marcus Williams", decisionMakerTitle: "Head of Risk Analytics",
      latitude: 35.2271, longitude: -80.8431, leadScore: 85,
      digitalMaturity: 80, growthPotential: 75, operationalComplexity: 90,
      dataVolumeIndicators: 92, marketingSophistication: 70,
      confidenceScore: 83, urgencyScore: 72, estimatedProjectValue: "$20,000 - $35,000",
      businessSummary: "FinanceHub Capital manages $2B+ in assets with complex risk modeling needs, regulatory reporting requirements, and growing demand for real-time portfolio analytics.",
      painPoints: JSON.stringify(["Legacy risk models slow to run on growing datasets", "Regulatory reporting is manual and error-prone", "Need real-time portfolio risk dashboards for executives"]),
      analyticsOpportunities: JSON.stringify(["Real-time risk dashboard", "Automated regulatory reporting", "Portfolio analytics platform", "Market data pipeline optimization"]),
      recommendedServices: JSON.stringify(["Risk analytics dashboard", "Regulatory automation", "Data pipeline modernization", "Executive reporting suite"]),
      aiInsights: JSON.stringify({"summary": "Strong finance prospect with clear regulatory and risk analytics needs", "bestApproach": "Lead with compliance efficiency gains and risk visualization", "riskLevel": "low-medium"}),
      pipelineStage: "Contacted", isFavorite: true, outreachStatus: "Contacted",
      tags: JSON.stringify(["finance", "risk", "compliance"]),
      notes: [{ content: "Marcus mentioned they're evaluating analytics vendors Q3. Good timing to build relationship." }],
      activities: [{ type: "email", title: "Sent introduction email", description: "Focused on risk analytics capabilities" }, { type: "phone", title: "Left voicemail", description: "Followed up via phone — left detailed voicemail" }],
    },
    {
      companyName: "BuildRight Manufacturing", industry: "Manufacturing", website: "https://buildrightmfg.com",
      address: "4500 Industrial Blvd", city: "Detroit", state: "MI", country: "US", postalCode: "48201",
      phone: "+1 (313) 555-0289", email: "it@buildrightmfg.com", linkedinUrl: "https://linkedin.com/company/buildright-manufacturing",
      companySize: "500+", estimatedRevenue: "$100M+", employeeCount: 850, googleRating: 4.0,
      reviewCount: 23, yearsInBusiness: 25, businessCategory: "Manufacturing",
      decisionMaker: "James O'Brien", decisionMakerTitle: "VP of Manufacturing",
      latitude: 42.3314, longitude: -83.0458, leadScore: 72,
      digitalMaturity: 55, growthPotential: 65, operationalComplexity: 95,
      dataVolumeIndicators: 88, marketingSophistication: 40,
      confidenceScore: 70, urgencyScore: 70, estimatedProjectValue: "$30,000 - $50,000",
      businessSummary: "BuildRight is a large manufacturer with IoT sensors across 3 production facilities generating massive operational data, but their analytics capabilities are significantly behind.",
      painPoints: JSON.stringify(["IoT sensor data underutilized — only 5% analyzed", "Quality control still largely manual", "Supply chain visibility limited to weekly reports"]),
      analyticsOpportunities: JSON.stringify(["IoT data analytics platform", "Predictive maintenance models", "Quality analytics dashboard", "Supply chain optimization"]),
      recommendedServices: JSON.stringify(["IoT data pipeline", "Predictive maintenance", "Quality control analytics", "Executive operations dashboard"]),
      aiInsights: JSON.stringify({"summary": "Large manufacturer with huge data opportunity but low digital maturity", "bestApproach": "Start with quick-win quality analytics, expand from there", "riskLevel": "medium-high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["manufacturing", "iot", "enterprise"]),
      notes: [], activities: [],
    },
    {
      companyName: "EduSpark Learning", industry: "Education", website: "https://eduspark.io",
      address: "500 Howard Street", city: "San Francisco", state: "CA", country: "US", postalCode: "94105",
      phone: "+1 (415) 555-0312", email: "hello@eduspark.io", linkedinUrl: "https://linkedin.com/company/eduspark-learning",
      companySize: "11-50", estimatedRevenue: "$1M - $5M", employeeCount: 35, googleRating: 4.8,
      reviewCount: 127, yearsInBusiness: 3, businessCategory: "EdTech Platform",
      decisionMaker: "Lisa Chang", decisionMakerTitle: "CEO & Co-Founder",
      latitude: 37.7879, longitude: -122.3965, leadScore: 68,
      digitalMaturity: 78, growthPotential: 92, operationalComplexity: 50,
      dataVolumeIndicators: 55, marketingSophistication: 75,
      confidenceScore: 65, urgencyScore: 55, estimatedProjectValue: "$5,000 - $10,000",
      businessSummary: "EduSpark is a rapidly growing EdTech startup with an AI-powered learning platform serving 50K+ students. They have strong product-market fit but limited analytics infrastructure.",
      painPoints: JSON.stringify(["Student engagement metrics are surface-level only", "Need to prove learning outcomes to school district clients", "Content recommendation engine needs data foundations"]),
      analyticsOpportunities: JSON.stringify(["Student engagement analytics", "Learning outcome tracking dashboard", "Content effectiveness analysis", "Churn prediction model"]),
      recommendedServices: JSON.stringify(["Learning analytics dashboard", "Student engagement tracking", "Outcome measurement framework", "Data foundation setup"]),
      aiInsights: JSON.stringify({"summary": "High-growth EdTech with future potential but current budget constraints", "bestApproach": "Offer starter engagement with clear ROI path", "riskLevel": "medium"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["edtech", "startup", "growth"]),
      notes: [], activities: [],
    },
    {
      companyName: "PropertyVista Realty", industry: "Real Estate", website: "https://propertyvista.com",
      address: "1200 Biscayne Blvd, Suite 1800", city: "Miami", state: "FL", country: "US", postalCode: "33131",
      phone: "+1 (305) 555-0345", email: "analytics@propertyvista.com", linkedinUrl: "https://linkedin.com/company/propertyvista-realty",
      companySize: "51-200", estimatedRevenue: "$25M - $50M", employeeCount: 120, googleRating: 4.3,
      reviewCount: 67, yearsInBusiness: 10, businessCategory: "Real Estate Investment",
      decisionMaker: "David Suarez", decisionMakerTitle: "Director of Acquisitions",
      latitude: 25.7742, longitude: -80.1936, leadScore: 74,
      digitalMaturity: 62, growthPotential: 78, operationalComplexity: 72,
      dataVolumeIndicators: 70, marketingSophistication: 65,
      confidenceScore: 72, urgencyScore: 60, estimatedProjectValue: "$12,000 - $20,000",
      businessSummary: "PropertyVista manages a $500M real estate portfolio across Florida and the Southeast, using data for property valuation, market analysis, and investment decision-making.",
      painPoints: JSON.stringify(["Property valuation models need refresh with current market data", "Competitive market analysis is manual and slow", "Investor reporting takes too long to compile"]),
      analyticsOpportunities: JSON.stringify(["Market intelligence dashboard", "Property valuation model", "Investor reporting automation", "Competitive analysis platform"]),
      recommendedServices: JSON.stringify(["Market analytics dashboard", "Automated valuation model", "Investor reporting system", "Data integration pipeline"]),
      aiInsights: JSON.stringify({"summary": "Solid real estate analytics prospect with clear data-driven needs", "bestApproach": "Focus on property valuation accuracy and speed improvements", "riskLevel": "medium"}),
      pipelineStage: "Contacted", isFavorite: false, outreachStatus: "Contacted",
      tags: JSON.stringify(["realestate", "investment", "mid-market"]),
      notes: [], activities: [{ type: "email", title: "Sent market analysis intro", description: "Shared sample Miami market analysis" }],
    },
    {
      companyName: "LogiCore Solutions", industry: "Logistics", website: "https://logicore.com",
      address: "900 Commerce Drive", city: "Dallas", state: "TX", country: "US", postalCode: "75201",
      phone: "+1 (214) 555-0378", email: "ops@logicore.com", linkedinUrl: "https://linkedin.com/company/logicore-solutions",
      companySize: "201-500", estimatedRevenue: "$50M - $100M", employeeCount: 280, googleRating: 4.1,
      reviewCount: 38, yearsInBusiness: 14, businessCategory: "Supply Chain & Logistics",
      decisionMaker: "Karen Mitchell", decisionMakerTitle: "VP of Operations",
      latitude: 32.7767, longitude: -96.7970, leadScore: 82,
      digitalMaturity: 70, growthPotential: 72, operationalComplexity: 92,
      dataVolumeIndicators: 90, marketingSophistication: 55,
      confidenceScore: 80, urgencyScore: 78, estimatedProjectValue: "$20,000 - $35,000",
      businessSummary: "LogiCore operates a nationwide logistics network with 500+ trucks and 15 distribution centers, generating massive real-time tracking and operational data.",
      painPoints: JSON.stringify(["Route optimization uses outdated algorithms", "Warehouse efficiency metrics reported weekly instead of real-time", "Fuel cost analytics not integrated with route data"]),
      analyticsOpportunities: JSON.stringify(["Real-time logistics dashboard", "Route optimization analytics", "Warehouse efficiency tracking", "Cost analytics platform"]),
      recommendedServices: JSON.stringify(["Operations dashboard", "Route analytics", "Warehouse KPI system", "Cost optimization analysis"]),
      aiInsights: JSON.stringify({"summary": "High-data-volume logistics company with clear operational analytics needs", "bestApproach": "Quantify fuel and time savings from analytics-driven route optimization", "riskLevel": "low-medium"}),
      pipelineStage: "New", isFavorite: true, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["logistics", "high-volume", "enterprise"]),
      notes: [], activities: [],
    },
    {
      companyName: "FreshBite Foods", industry: "Food & Beverage", website: "https://freshbitefoods.com",
      address: "3400 N Pulaski Rd", city: "Chicago", state: "IL", country: "US", postalCode: "60641",
      phone: "+1 (773) 555-0401", email: "ops@freshbitefoods.com", linkedinUrl: "https://linkedin.com/company/freshbite-foods",
      companySize: "51-200", estimatedRevenue: "$25M - $50M", employeeCount: 95, googleRating: 4.6,
      reviewCount: 156, yearsInBusiness: 7, businessCategory: "Food Distribution",
      decisionMaker: "Tom Garcia", decisionMakerTitle: "COO",
      latitude: 41.9490, longitude: -87.7278, leadScore: 65,
      digitalMaturity: 50, growthPotential: 70, operationalComplexity: 68,
      dataVolumeIndicators: 60, marketingSophistication: 72,
      confidenceScore: 62, urgencyScore: 52, estimatedProjectValue: "$8,000 - $15,000",
      businessSummary: "FreshBite Foods is a regional food distributor serving 500+ restaurant clients, managing inventory, delivery routes, and customer orders across the Midwest.",
      painPoints: JSON.stringify(["Demand forecasting is guesswork — 30% food waste rate", "Customer order patterns not analyzed for upsell opportunities", "Delivery route planning is semi-manual"]),
      analyticsOpportunities: JSON.stringify(["Demand forecasting model", "Customer analytics for upselling", "Delivery route optimization", "Inventory analytics dashboard"]),
      recommendedServices: JSON.stringify(["Demand forecasting", "Customer analytics", "Inventory optimization", "Sales dashboard"]),
      aiInsights: JSON.stringify({"summary": "Food distributor with quantifiable waste reduction opportunity", "bestApproach": "Lead with food waste reduction ROI — $500K+ potential savings", "riskLevel": "medium"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["food", "distribution", "waste-reduction"]),
      notes: [], activities: [],
    },
    {
      companyName: "TechVision Consulting", industry: "Professional Services", website: "https://techvisionconsulting.com",
      address: "1000 Wilshire Blvd, Suite 500", city: "Los Angeles", state: "CA", country: "US", postalCode: "90017",
      phone: "+1 (213) 555-0423", email: "partners@techvisionconsulting.com", linkedinUrl: "https://linkedin.com/company/techvision-consulting",
      companySize: "11-50", estimatedRevenue: "$5M - $10M", employeeCount: 42, googleRating: 4.9,
      reviewCount: 78, yearsInBusiness: 5, businessCategory: "IT Consulting",
      decisionMaker: "Priya Sharma", decisionMakerTitle: "Managing Partner",
      latitude: 34.0492, longitude: -118.2594, leadScore: 70,
      digitalMaturity: 82, growthPotential: 75, operationalComplexity: 55,
      dataVolumeIndicators: 50, marketingSophistication: 85,
      confidenceScore: 68, urgencyScore: 50, estimatedProjectValue: "$5,000 - $12,000",
      businessSummary: "TechVision is an IT consulting firm that ironically lacks data analytics for their own business operations, including project profitability and resource utilization.",
      painPoints: JSON.stringify(["No visibility into project profitability by client", "Resource utilization tracked in spreadsheets", "Can't predict revenue pipeline accurately"]),
      analyticsOpportunities: JSON.stringify(["Project profitability dashboard", "Resource utilization analytics", "Revenue forecasting model", "Client health scoring"]),
      recommendedServices: JSON.stringify(["Business analytics dashboard", "Project metrics platform", "Revenue forecasting", "Client analytics"]),
      aiInsights: JSON.stringify({"summary": "Consulting firm that needs to eat their own cooking", "bestApproach": "Position as 'practice what we preach' analytics for consultants", "riskLevel": "medium"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["consulting", "self-serve", "professional"]),
      notes: [], activities: [],
    },
    // Add more leads with lower scores for variety
    {
      companyName: "MountainView Hotels", industry: "Hospitality", website: "https://mountainviewhotels.com",
      address: "800 Pikes Peak Ave", city: "Denver", state: "CO", country: "US", postalCode: "80203",
      phone: "+1 (303) 555-0456", email: "info@mountainviewhotels.com", linkedinUrl: "https://linkedin.com/company/mountainview-hotels",
      companySize: "51-200", estimatedRevenue: "$10M - $25M", employeeCount: 165, googleRating: 4.4,
      reviewCount: 312, yearsInBusiness: 18, businessCategory: "Hotel Chain",
      decisionMaker: "Rebecca Frost", decisionMakerTitle: "VP of Revenue",
      latitude: 39.7392, longitude: -104.9903, leadScore: 58,
      digitalMaturity: 48, growthPotential: 60, operationalComplexity: 65,
      dataVolumeIndicators: 72, marketingSophistication: 68,
      confidenceScore: 55, urgencyScore: 42, estimatedProjectValue: "$8,000 - $14,000",
      businessSummary: "MountainView operates 12 boutique hotels across Colorado, with rich booking and guest data but limited analytics beyond basic occupancy metrics.",
      painPoints: JSON.stringify(["Revenue management is manual and reactive", "Guest segmentation is non-existent", "Marketing spend attribution unclear"]),
      analyticsOpportunities: JSON.stringify(["Revenue management dashboard", "Guest segmentation engine", "Marketing attribution analysis", "Occupancy forecasting"]),
      recommendedServices: JSON.stringify(["Revenue analytics", "Guest analytics", "Marketing dashboard"]),
      aiInsights: JSON.stringify({"summary": "Hotel chain with underdeveloped analytics, moderate opportunity", "bestApproach": "Focus on revenue uplift from data-driven pricing", "riskLevel": "medium-high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["hospitality", "revenue"]),
      notes: [], activities: [],
    },
    {
      companyName: "SwiftDelivery Express", industry: "Logistics", website: "https://swiftdeliveryexpress.com",
      address: "2500 Ridge Ave", city: "Philadelphia", state: "PA", country: "US", postalCode: "19114",
      phone: "+1 (215) 555-0489", email: "ops@swiftdeliveryexpress.com", linkedinUrl: "https://linkedin.com/company/swift-delivery-express",
      companySize: "201-500", estimatedRevenue: "$25M - $50M", employeeCount: 240, googleRating: 3.8,
      reviewCount: 45, yearsInBusiness: 9, businessCategory: "Last-Mile Delivery",
      decisionMaker: "Chris Johnson", decisionMakerTitle: "Head of Operations",
      latitude: 40.0757, longitude: -75.0188, leadScore: 63,
      digitalMaturity: 58, growthPotential: 68, operationalComplexity: 82,
      dataVolumeIndicators: 78, marketingSophistication: 45,
      confidenceScore: 60, urgencyScore: 58, estimatedProjectValue: "$12,000 - $20,000",
      businessSummary: "SwiftDelivery is a regional last-mile delivery company handling 50K+ deliveries/month with significant route and driver performance data.",
      painPoints: JSON.stringify(["Driver performance tracking is basic", "Route efficiency not systematically measured", "Customer delivery satisfaction data not analyzed"]),
      analyticsOpportunities: JSON.stringify(["Driver performance dashboard", "Route efficiency analytics", "Customer satisfaction tracking", "Delivery time optimization"]),
      recommendedServices: JSON.stringify(["Operations dashboard", "Driver analytics", "Route optimization"]),
      aiInsights: JSON.stringify({"summary": "Delivery company with operational data goldmine", "bestApproach": "Show driver productivity gains from analytics", "riskLevel": "medium"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["logistics", "delivery", "ops"]),
      notes: [], activities: [],
    },
    {
      companyName: "Apex Fitness Clubs", industry: "Health & Wellness", website: "https://apexfitness.com",
      address: "55 Water St", city: "New York", state: "NY", country: "US", postalCode: "10004",
      phone: "+1 (646) 555-0512", email: "marketing@apexfitness.com", linkedinUrl: "https://linkedin.com/company/apex-fitness-clubs",
      companySize: "51-200", estimatedRevenue: "$5M - $10M", employeeCount: 88, googleRating: 4.5,
      reviewCount: 203, yearsInBusiness: 8, businessCategory: "Fitness Chain",
      decisionMaker: "Derek Williams", decisionMakerTitle: "Marketing Director",
      latitude: 40.7030, longitude: -74.0120, leadScore: 52,
      digitalMaturity: 55, growthPotential: 62, operationalComplexity: 45,
      dataVolumeIndicators: 50, marketingSophistication: 78,
      confidenceScore: 48, urgencyScore: 38, estimatedProjectValue: "$5,000 - $8,000",
      businessSummary: "Apex operates 6 premium fitness clubs in NYC with member data, attendance tracking, and class booking systems generating useful analytics data.",
      painPoints: JSON.stringify(["Member churn prediction is reactive not proactive", "Class scheduling based on intuition not data", "Marketing campaigns not personalized"]),
      analyticsOpportunities: JSON.stringify(["Member churn prediction", "Class demand forecasting", "Personalized marketing analytics", "Member lifetime value analysis"]),
      recommendedServices: JSON.stringify(["Churn prediction model", "Member analytics dashboard", "Marketing analytics"]),
      aiInsights: JSON.stringify({"summary": "Fitness chain with decent data but limited analytics maturity", "bestApproach": "Start with churn reduction — immediate revenue impact", "riskLevel": "medium-high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["fitness", "churn", "marketing"]),
      notes: [], activities: [],
    },
    {
      companyName: "CloudScale Systems", industry: "Technology", website: "https://cloudscale.io",
      address: "501 2nd St", city: "San Francisco", state: "CA", country: "US", postalCode: "94107",
      phone: "+1 (415) 555-0534", email: "info@cloudscale.io", linkedinUrl: "https://linkedin.com/company/cloudscale-systems",
      companySize: "201-500", estimatedRevenue: "$50M - $100M", employeeCount: 275, googleRating: 4.6,
      reviewCount: 95, yearsInBusiness: 6, businessCategory: "Cloud Infrastructure",
      decisionMaker: "Alex Nguyen", decisionMakerTitle: "VP Engineering",
      latitude: 37.7857, longitude: -122.3933, leadScore: 88,
      digitalMaturity: 95, growthPotential: 82, operationalComplexity: 78,
      dataVolumeIndicators: 85, marketingSophistication: 80,
      confidenceScore: 87, urgencyScore: 75, estimatedProjectValue: "$18,000 - $30,000",
      businessSummary: "CloudScale provides cloud infrastructure monitoring and optimization services, processing petabytes of performance data for enterprise clients.",
      painPoints: JSON.stringify(["Internal analytics team overloaded with ad-hoc requests", "Need automated client-facing reporting dashboards", "Alert correlation across systems needs improvement"]),
      analyticsOpportunities: JSON.stringify(["Client reporting automation", "Alert analytics dashboard", "Performance trend analysis", "Capacity planning model"]),
      recommendedServices: JSON.stringify(["Client reporting platform", "Operations dashboard", "Performance analytics"]),
      aiInsights: JSON.stringify({"summary": "Tech company that understands analytics value — needs capacity", "bestApproach": "Position as augmenting their team, not replacing", "riskLevel": "low"}),
      pipelineStage: "Contacted", isFavorite: true, outreachStatus: "Contacted",
      tags: JSON.stringify(["tech", "cloud", "enterprise"]),
      notes: [{ content: "Alex is interested but wants to see a proof of concept first. Preparing sample dashboard." }],
      activities: [{ type: "email", title: "Sent technical intro", description: "Detailed capabilities overview with architecture diagrams" }],
    },
    {
      companyName: "BrightPath Insurance", industry: "Insurance", website: "https://brightpathinsurance.com",
      address: "100 Market St, Suite 700", city: "Hartford", state: "CT", country: "US", postalCode: "06103",
      phone: "+1 (860) 555-0567", email: "analytics@brightpathinsurance.com", linkedinUrl: "https://linkedin.com/company/brightpath-insurance",
      companySize: "500+", estimatedRevenue: "$100M+", employeeCount: 1200, googleRating: 3.9,
      reviewCount: 67, yearsInBusiness: 30, businessCategory: "Insurance Carrier",
      decisionMaker: "Sandra Clark", decisionMakerTitle: "SVP of Analytics",
      latitude: 41.7658, longitude: -72.6734, leadScore: 86,
      digitalMaturity: 75, growthPotential: 55, operationalComplexity: 95,
      dataVolumeIndicators: 95, marketingSophistication: 60,
      confidenceScore: 84, urgencyScore: 80, estimatedProjectValue: "$40,000 - $60,000",
      businessSummary: "BrightPath is a mid-sized insurance carrier with extensive claims, policy, and customer data across multiple product lines, currently modernizing their analytics stack.",
      painPoints: JSON.stringify(["Claims fraud detection needs ML upgrade", "Underwriting analytics still largely rule-based", "Customer lifetime value models outdated"]),
      analyticsOpportunities: JSON.stringify(["Claims analytics platform", "Underwriting risk dashboard", "Customer lifetime value model", "Regulatory reporting automation"]),
      recommendedServices: JSON.stringify(["Claims analytics", "Underwriting dashboard", "Customer analytics", "Data modernization consulting"]),
      aiInsights: JSON.stringify({"summary": "Enterprise insurance with major analytics modernization underway", "bestApproach": "Position for specific modernization workstream, not whole transformation", "riskLevel": "low-medium"}),
      pipelineStage: "Meeting Set", isFavorite: true, outreachStatus: "Meeting Set",
      tags: JSON.stringify(["insurance", "enterprise", "modernization"]),
      notes: [{ content: "Meeting scheduled for next Tuesday with Sandra and her analytics team. They have budget approved for Q3." }],
      activities: [{ type: "email", title: "Sent insurance analytics whitepaper", description: "Claims analytics ROI case study" }, { type: "meeting", title: "Initial discovery meeting scheduled", description: "Tuesday 2pm with Sandra Clark and team" }],
    },
    // More moderate and lower-scoring leads
    {
      companyName: "QuickMart Convenience", industry: "Retail", website: "https://quickmartstores.com",
      address: "1200 Main St", city: "Phoenix", state: "AZ", country: "US", postalCode: "85004",
      phone: "+1 (602) 555-0589", email: "info@quickmartstores.com", linkedinUrl: "https://linkedin.com/company/quickmart",
      companySize: "201-500", estimatedRevenue: "$50M - $100M", employeeCount: 450, googleRating: 3.7,
      reviewCount: 89, yearsInBusiness: 20, businessCategory: "Convenience Store Chain",
      decisionMaker: "Bill Thompson", decisionMakerTitle: "Operations Manager",
      latitude: 33.4484, longitude: -112.0740, leadScore: 42,
      digitalMaturity: 30, growthPotential: 45, operationalComplexity: 60,
      dataVolumeIndicators: 55, marketingSophistication: 35,
      confidenceScore: 40, urgencyScore: 30, estimatedProjectValue: "$10,000 - $18,000",
      businessSummary: "QuickMart operates 85 convenience stores with basic POS data but minimal analytics capability.",
      painPoints: JSON.stringify(["Inventory management is reactive", "No understanding of purchase patterns across stores"]),
      analyticsOpportunities: JSON.stringify(["Inventory analytics", "Sales pattern analysis", "Store performance comparison"]),
      recommendedServices: JSON.stringify(["Sales dashboard", "Inventory analytics"]),
      aiInsights: JSON.stringify({"summary": "Low digital maturity but large data volume", "bestApproach": "Long-term nurture — start with free analytics audit", "riskLevel": "high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["retail", "convenience", "low-maturity"]),
      notes: [], activities: [],
    },
    {
      companyName: "Alpine Adventures", industry: "Travel & Tourism", website: "https://alpineadventures.com",
      address: "300 Snowmass Rd", city: "Aspen", state: "CO", country: "US", postalCode: "81611",
      phone: "+1 (970) 555-0601", email: "info@alpineadventures.com", linkedinUrl: "https://linkedin.com/company/alpine-adventures",
      companySize: "1-10", estimatedRevenue: "$1M - $5M", employeeCount: 8, googleRating: 4.9,
      reviewCount: 245, yearsInBusiness: 4, businessCategory: "Adventure Tourism",
      decisionMaker: "Jake Morrison", decisionMakerTitle: "Owner",
      latitude: 39.1911, longitude: -106.8175, leadScore: 35,
      digitalMaturity: 45, growthPotential: 55, operationalComplexity: 25,
      dataVolumeIndicators: 20, marketingSophistication: 70,
      confidenceScore: 32, urgencyScore: 20, estimatedProjectValue: "$2,000 - $5,000",
      businessSummary: "Small but highly-rated adventure tourism company with limited data needs.",
      painPoints: JSON.stringify(["Seasonal booking patterns hard to forecast", "Marketing ROI unclear"]),
      analyticsOpportunities: JSON.stringify(["Booking analytics", "Seasonal demand model", "Marketing attribution"]),
      recommendedServices: JSON.stringify(["Booking dashboard", "Marketing analytics"]),
      aiInsights: JSON.stringify({"summary": "Too small for significant engagement currently", "bestApproach": "Nurture for future growth", "riskLevel": "high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["travel", "small-business"]),
      notes: [], activities: [],
    },
    {
      companyName: "Precision Parts Manufacturing", industry: "Manufacturing", website: "https://precisionparts.com",
      address: "1500 Industrial Way", city: "Milwaukee", state: "WI", country: "US", postalCode: "53201",
      phone: "+1 (414) 555-0623", email: "sales@precisionparts.com", linkedinUrl: "https://linkedin.com/company/precision-parts-mfg",
      companySize: "51-200", estimatedRevenue: "$25M - $50M", employeeCount: 110, googleRating: 4.2,
      reviewCount: 28, yearsInBusiness: 22, businessCategory: "Precision Manufacturing",
      decisionMaker: "Frank Miller", decisionMakerTitle: "Plant Manager",
      latitude: 43.0389, longitude: -87.9065, leadScore: 55,
      digitalMaturity: 40, growthPotential: 50, operationalComplexity: 80,
      dataVolumeIndicators: 72, marketingSophistication: 30,
      confidenceScore: 52, urgencyScore: 48, estimatedProjectValue: "$10,000 - $18,000",
      businessSummary: "Precision parts manufacturer with CNC machines generating quality data but using legacy analysis methods.",
      painPoints: JSON.stringify(["Quality control relies on sampling, not full data", "Machine downtime not systematically analyzed"]),
      analyticsOpportunities: JSON.stringify(["Quality analytics dashboard", "Machine downtime analysis", "Production efficiency metrics"]),
      recommendedServices: JSON.stringify(["Quality analytics", "Production dashboard"]),
      aiInsights: JSON.stringify({"summary": "Traditional manufacturer with potential for analytics-driven quality improvement", "bestApproach": "Focus on defect reduction ROI", "riskLevel": "medium-high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["manufacturing", "quality"]),
      notes: [], activities: [],
    },
    {
      companyName: "UrbanNest Realty", industry: "Real Estate", website: "https://urbannestrealty.com",
      address: "700 5th Ave S", city: "Seattle", state: "WA", country: "US", postalCode: "98104",
      phone: "+1 (206) 555-0645", email: "agents@urbannestrealty.com", linkedinUrl: "https://linkedin.com/company/urbannest-realty",
      companySize: "11-50", estimatedRevenue: "$5M - $10M", employeeCount: 32, googleRating: 4.7,
      reviewCount: 142, yearsInBusiness: 6, businessCategory: "Residential Real Estate",
      decisionMaker: "Amy Liu", decisionMakerTitle: "Broker/Owner",
      latitude: 47.6062, longitude: -122.3321, leadScore: 48,
      digitalMaturity: 60, growthPotential: 65, operationalComplexity: 35,
      dataVolumeIndicators: 40, marketingSophistication: 75,
      confidenceScore: 45, urgencyScore: 35, estimatedProjectValue: "$3,000 - $8,000",
      businessSummary: "Boutique residential real estate firm with good market data access but limited internal analytics capability.",
      painPoints: JSON.stringify(["CMA reports take hours to compile", "No systematic lead scoring for buyer leads"]),
      analyticsOpportunities: JSON.stringify(["Automated CMA generation", "Lead scoring model", "Market trend dashboard"]),
      recommendedServices: JSON.stringify(["Market analytics dashboard", "Lead scoring"]),
      aiInsights: JSON.stringify({"summary": "Small but data-aware real estate firm", "bestApproach": "Offer automated CMA tool as entry point", "riskLevel": "medium-high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["realestate", "residential", "small"]),
      notes: [], activities: [],
    },
    {
      companyName: "DataVista Media", industry: "Media", website: "https://datavistamedia.com",
      address: "450 W 33rd St", city: "New York", state: "NY", country: "US", postalCode: "10001",
      phone: "+1 (212) 555-0667", email: "analytics@datavistamedia.com", linkedinUrl: "https://linkedin.com/company/datavista-media",
      companySize: "51-200", estimatedRevenue: "$25M - $50M", employeeCount: 85, googleRating: 4.3,
      reviewCount: 56, yearsInBusiness: 7, businessCategory: "Digital Media & Publishing",
      decisionMaker: "Nicole Brown", decisionMakerTitle: "VP of Audience Development",
      latitude: 40.7505, longitude: -73.9934, leadScore: 76,
      digitalMaturity: 78, growthPotential: 72, operationalComplexity: 60,
      dataVolumeIndicators: 80, marketingSophistication: 88,
      confidenceScore: 74, urgencyScore: 62, estimatedProjectValue: "$10,000 - $18,000",
      businessSummary: "DataVista is a digital media company running 15+ content sites with rich audience analytics data but underutilized insights capabilities.",
      painPoints: JSON.stringify(["Content performance analytics fragmented across platforms", "Audience segmentation is basic", "Ad revenue optimization not data-driven"]),
      analyticsOpportunities: JSON.stringify(["Unified content analytics", "Audience segmentation engine", "Ad revenue optimization", "Content recommendation dashboard"]),
      recommendedServices: JSON.stringify(["Content analytics dashboard", "Audience analytics", "Revenue optimization"]),
      aiInsights: JSON.stringify({"summary": "Media company that lives in data but needs better analytics tools", "bestApproach": "Show how unified analytics increases ad revenue per page", "riskLevel": "low-medium"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["media", "publishing", "audience"]),
      notes: [], activities: [],
    },
    {
      companyName: "SafeGuard Security", industry: "Professional Services", website: "https://safeguardsecurity.com",
      address: "2100 Ross Ave", city: "Dallas", state: "TX", country: "US", postalCode: "75201",
      phone: "+1 (214) 555-0689", email: "info@safeguardsecurity.com", linkedinUrl: "https://linkedin.com/company/safeguard-security",
      companySize: "201-500", estimatedRevenue: "$25M - $50M", employeeCount: 350, googleRating: 4.1,
      reviewCount: 34, yearsInBusiness: 12, businessCategory: "Security Services",
      decisionMaker: "Mark Stevens", decisionMakerTitle: "Director of Operations",
      latitude: 32.7934, longitude: -96.7662, leadScore: 50,
      digitalMaturity: 35, growthPotential: 48, operationalComplexity: 70,
      dataVolumeIndicators: 60, marketingSophistication: 38,
      confidenceScore: 48, urgencyScore: 40, estimatedProjectValue: "$8,000 - $15,000",
      businessSummary: "SafeGuard provides security services with guard tracking and incident reporting data that could be better leveraged.",
      painPoints: JSON.stringify(["Incident reporting is paper-based", "Guard performance metrics not tracked systematically"]),
      analyticsOpportunities: JSON.stringify(["Incident analytics dashboard", "Guard performance tracking", "Client reporting automation"]),
      recommendedServices: JSON.stringify(["Operations dashboard", "Incident reporting system"]),
      aiInsights: JSON.stringify({"summary": "Security company with operational data opportunity", "bestApproach": "Start with digital transformation of incident reporting", "riskLevel": "medium-high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["security", "operations"]),
      notes: [], activities: [],
    },
    {
      companyName: "GreenEnergy Solutions", industry: "Energy", website: "https://greenenergysolutions.com",
      address: "600 Congress Ave", city: "Austin", state: "TX", country: "US", postalCode: "78701",
      phone: "+1 (512) 555-0701", email: "data@greenenergysolutions.com", linkedinUrl: "https://linkedin.com/company/greenenergy-solutions",
      companySize: "51-200", estimatedRevenue: "$25M - $50M", employeeCount: 130, googleRating: 4.5,
      reviewCount: 71, yearsInBusiness: 9, businessCategory: "Renewable Energy",
      decisionMaker: "Diana Martinez", decisionMakerTitle: "VP of Engineering",
      latitude: 30.2747, longitude: -97.7404, leadScore: 80,
      digitalMaturity: 72, growthPotential: 85, operationalComplexity: 82,
      dataVolumeIndicators: 85, marketingSophistication: 58,
      confidenceScore: 78, urgencyScore: 72, estimatedProjectValue: "$15,000 - $25,000",
      businessSummary: "GreenEnergy Solutions installs and manages solar and wind installations with IoT monitoring data across 200+ sites.",
      painPoints: JSON.stringify(["Energy production forecasting needs improvement", "Maintenance scheduling reactive instead of predictive", "Multiple data systems not integrated"]),
      analyticsOpportunities: JSON.stringify(["Energy production forecasting", "Predictive maintenance dashboard", "Site performance comparison", "Integrated monitoring platform"]),
      recommendedServices: JSON.stringify(["Production analytics", "Maintenance dashboard", "Site performance platform"]),
      aiInsights: JSON.stringify({"summary": "Green energy company with IoT data opportunity and growth trajectory", "bestApproach": "Quantify energy production gains from predictive analytics", "riskLevel": "low-medium"}),
      pipelineStage: "Contacted", isFavorite: false, outreachStatus: "Contacted",
      tags: JSON.stringify(["energy", "iot", "sustainability"]),
      notes: [], activities: [{ type: "email", title: "Sent energy analytics intro", description: "Focused on production optimization potential" }],
    },
    {
      companyName: "LegalEdge Associates", industry: "Legal", website: "https://legaledge.com",
      address: "1200 19th St NW", city: "Washington", state: "DC", country: "US", postalCode: "20036",
      phone: "+1 (202) 555-0723", email: "admin@legaledge.com", linkedinUrl: "https://linkedin.com/company/legal-edge-associates",
      companySize: "51-200", estimatedRevenue: "$10M - $25M", employeeCount: 65, googleRating: 4.4,
      reviewCount: 38, yearsInBusiness: 15, businessCategory: "Law Firm",
      decisionMaker: "Robert Hayes", decisionMakerTitle: "Managing Partner",
      latitude: 38.9051, longitude: -77.0452, leadScore: 45,
      digitalMaturity: 38, growthPotential: 42, operationalComplexity: 55,
      dataVolumeIndicators: 40, marketingSophistication: 45,
      confidenceScore: 42, urgencyScore: 28, estimatedProjectValue: "$5,000 - $10,000",
      businessSummary: "Mid-sized law firm with case and billing data that could support better practice management analytics.",
      painPoints: JSON.stringify(["Partner profitability unclear", "Case duration tracking is manual"]),
      analyticsOpportunities: JSON.stringify(["Practice analytics dashboard", "Case duration analysis", "Revenue per partner tracking"]),
      recommendedServices: JSON.stringify(["Practice dashboard", "Revenue analytics"]),
      aiInsights: JSON.stringify({"summary": "Law firm with basic analytics needs — conservative industry", "bestApproach": "Focus on revenue visibility for managing partners", "riskLevel": "high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["legal", "conservative"]),
      notes: [], activities: [],
    },
    {
      companyName: "Pawsome Pet Care", industry: "Consumer Services", website: "https://pawsomepetcare.com",
      address: "2500 Broadway", city: "Nashville", state: "TN", country: "US", postalCode: "37203",
      phone: "+1 (615) 555-0745", email: "hello@pawsomepetcare.com", linkedinUrl: "https://linkedin.com/company/pawsome-pet-care",
      companySize: "1-10", estimatedRevenue: "$500K - $1M", employeeCount: 6, googleRating: 4.8,
      reviewCount: 312, yearsInBusiness: 2, businessCategory: "Pet Services",
      decisionMaker: "Megan Taylor", decisionMakerTitle: "Founder",
      latitude: 36.1547, longitude: -86.7793, leadScore: 25,
      digitalMaturity: 35, growthPotential: 60, operationalComplexity: 20,
      dataVolumeIndicators: 15, marketingSophistication: 80,
      confidenceScore: 22, urgencyScore: 15, estimatedProjectValue: "$1,000 - $3,000",
      businessSummary: "Small pet care startup with great reviews but minimal data needs or budget for analytics services.",
      painPoints: JSON.stringify(["Customer scheduling could be optimized"]),
      analyticsOpportunities: JSON.stringify(["Basic customer analytics"]),
      recommendedServices: JSON.stringify(["Simple dashboard"]),
      aiInsights: JSON.stringify({"summary": "Too small for meaningful engagement", "bestApproach": "Long-term nurture only", "riskLevel": "very-high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["small-business", "pet-care"]),
      notes: [], activities: [],
    },
    {
      companyName: "InnovateTech Labs", industry: "Technology", website: "https://innovatetechlabs.com",
      address: "100 University Ave", city: "Palo Alto", state: "CA", country: "US", postalCode: "94301",
      phone: "+1 (650) 555-0767", email: "info@innovatetechlabs.com", linkedinUrl: "https://linkedin.com/company/innovate-tech-labs",
      companySize: "11-50", estimatedRevenue: "$5M - $10M", employeeCount: 28, googleRating: 4.7,
      reviewCount: 52, yearsInBusiness: 3, businessCategory: "R&D Lab",
      decisionMaker: "Dr. Kevin Zhao", decisionMakerTitle: "CTO",
      latitude: 37.4419, longitude: -122.1430, leadScore: 73,
      digitalMaturity: 85, growthPotential: 88, operationalComplexity: 62,
      dataVolumeIndicators: 65, marketingSophistication: 55,
      confidenceScore: 70, urgencyScore: 60, estimatedProjectValue: "$8,000 - $15,000",
      businessSummary: "InnovateTech is an R&D lab developing AI/ML products with strong technical capabilities but needs better experimental tracking and analytics.",
      painPoints: JSON.stringify(["Experiment tracking is ad-hoc", "Model performance comparisons manual", "Research data not centralized"]),
      analyticsOpportunities: JSON.stringify(["Experiment tracking dashboard", "Model performance analytics", "Research data platform"]),
      recommendedServices: JSON.stringify(["Experiment analytics", "ML monitoring dashboard"]),
      aiInsights: JSON.stringify({"summary": "Tech-savvy R&D team that needs structured analytics", "bestApproach": "Technical approach — focus on experiment reproducibility", "riskLevel": "medium"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["tech", "rd", "ml"]),
      notes: [], activities: [],
    },
    {
      companyName: "Summit Financial Advisors", industry: "Finance", website: "https://summitfinancial.com",
      address: "400 S Royal Poinciana Blvd", city: "Palm Beach", state: "FL", country: "US", postalCode: "33480",
      phone: "+1 (561) 555-0789", email: "info@summitfinancial.com", linkedinUrl: "https://linkedin.com/company/summit-financial-advisors",
      companySize: "11-50", estimatedRevenue: "$5M - $10M", employeeCount: 22, googleRating: 4.6,
      reviewCount: 41, yearsInBusiness: 11, businessCategory: "Wealth Management",
      decisionMaker: "Patricia Wells", decisionMakerTitle: "Managing Director",
      latitude: 26.7056, longitude: -80.0364, leadScore: 60,
      digitalMaturity: 55, growthPotential: 58, operationalComplexity: 45,
      dataVolumeIndicators: 50, marketingSophistication: 70,
      confidenceScore: 58, urgencyScore: 42, estimatedProjectValue: "$5,000 - $12,000",
      businessSummary: "Wealth management firm with portfolio and client data that could support better reporting and client retention analytics.",
      painPoints: JSON.stringify(["Client portfolio reports manually generated monthly", "Client retention risk not systematically tracked"]),
      analyticsOpportunities: JSON.stringify(["Automated portfolio reporting", "Client health scoring", "Revenue analytics"]),
      recommendedServices: JSON.stringify(["Client reporting dashboard", "Portfolio analytics"]),
      aiInsights: JSON.stringify({"summary": "Wealth manager with reporting automation opportunity", "bestApproach": "Demonstrate automated reporting that saves 20+ hours/month", "riskLevel": "medium"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["finance", "wealth", "reporting"]),
      notes: [], activities: [],
    },
    {
      companyName: "Coastal Construction Co", industry: "Construction", website: "https://coastalconstruction.com",
      address: "1800 Ocean Blvd", city: "Myrtle Beach", state: "SC", country: "US", postalCode: "29577",
      phone: "+1 (843) 555-0801", email: "projects@coastalconstruction.com", linkedinUrl: "https://linkedin.com/company/coastal-construction",
      companySize: "51-200", estimatedRevenue: "$25M - $50M", employeeCount: 175, googleRating: 4.0,
      reviewCount: 29, yearsInBusiness: 16, businessCategory: "Commercial Construction",
      decisionMaker: "Mike Sullivan", decisionMakerTitle: "Project Director",
      latitude: 33.6891, longitude: -78.8868, leadScore: 47,
      digitalMaturity: 32, growthPotential: 40, operationalComplexity: 75,
      dataVolumeIndicators: 55, marketingSophistication: 28,
      confidenceScore: 44, urgencyScore: 35, estimatedProjectValue: "$10,000 - $20,000",
      businessSummary: "Commercial construction company with project management and cost data but very low digital maturity.",
      painPoints: JSON.stringify(["Project cost tracking is spreadsheet-based", "Resource allocation is manual", "No historical cost analytics for estimating"]),
      analyticsOpportunities: JSON.stringify(["Project cost dashboard", "Resource allocation analytics", "Historical cost database for estimating"]),
      recommendedServices: JSON.stringify(["Project analytics", "Cost dashboard"]),
      aiInsights: JSON.stringify({"summary": "Construction firm with data needs but low digital readiness", "bestApproach": "Longer sales cycle — start with cost tracking quick win", "riskLevel": "high"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["construction", "cost-tracking"]),
      notes: [], activities: [],
    },
    {
      companyName: "MediaPulse Digital", industry: "Marketing", website: "https://mediapulsedigital.com",
      address: "340 Madison Ave", city: "New York", state: "NY", country: "US", postalCode: "10173",
      phone: "+1 (646) 555-0823", email: "hello@mediapulsedigital.com", linkedinUrl: "https://linkedin.com/company/mediapulse-digital",
      companySize: "11-50", estimatedRevenue: "$5M - $10M", employeeCount: 38, googleRating: 4.5,
      reviewCount: 63, yearsInBusiness: 4, businessCategory: "Digital Marketing Agency",
      decisionMaker: "Sophia Kim", decisionMakerTitle: "CEO",
      latitude: 40.7509, longitude: -73.9772, leadScore: 66,
      digitalMaturity: 75, growthPotential: 78, operationalComplexity: 48,
      dataVolumeIndicators: 60, marketingSophistication: 92,
      confidenceScore: 63, urgencyScore: 48, estimatedProjectValue: "$5,000 - $10,000",
      businessSummary: "Digital marketing agency that produces analytics for clients but lacks internal business analytics for their own agency performance.",
      painPoints: JSON.stringify(["Client reporting is manual across multiple platforms", "Agency profitability per client not tracked", "Team utilization not measured"]),
      analyticsOpportunities: JSON.stringify(["Client reporting automation", "Agency profitability dashboard", "Team utilization tracking"]),
      recommendedServices: JSON.stringify(["Reporting automation", "Business analytics dashboard"]),
      aiInsights: JSON.stringify({"summary": "Marketing agency that needs to apply analytics to themselves", "bestApproach": "Meta-approach — analytics for the analytics provider", "riskLevel": "medium"}),
      pipelineStage: "New", isFavorite: false, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["marketing", "agency"]),
      notes: [], activities: [],
    },
    {
      companyName: "CoreStack Data Centers", industry: "Technology", website: "https://corestackdc.com",
      address: "1275 K St NW", city: "Washington", state: "DC", country: "US", postalCode: "20005",
      phone: "+1 (202) 555-0845", email: "ops@corestackdc.com", linkedinUrl: "https://linkedin.com/company/corestack-data-centers",
      companySize: "51-200", estimatedRevenue: "$50M - $100M", employeeCount: 95, googleRating: 4.2,
      reviewCount: 31, yearsInBusiness: 10, businessCategory: "Data Center Services",
      decisionMaker: "Victor Huang", decisionMakerTitle: "VP of Infrastructure",
      latitude: 38.9051, longitude: -77.0302, leadScore: 83,
      digitalMaturity: 82, growthPotential: 70, operationalComplexity: 88,
      dataVolumeIndicators: 92, marketingSophistication: 52,
      confidenceScore: 81, urgencyScore: 68, estimatedProjectValue: "$20,000 - $35,000",
      businessSummary: "CoreStack operates 4 data centers with extensive infrastructure monitoring data, needing better capacity planning and efficiency analytics.",
      painPoints: JSON.stringify(["Capacity planning based on historical averages", "Energy efficiency not systematically tracked", "SLA reporting is manual"]),
      analyticsOpportunities: JSON.stringify(["Capacity planning dashboard", "Energy efficiency analytics", "SLA reporting automation", "Infrastructure performance platform"]),
      recommendedServices: JSON.stringify(["Capacity analytics", "Infrastructure dashboard", "SLA reporting"]),
      aiInsights: JSON.stringify({"summary": "Data center operator with high-value infrastructure analytics needs", "bestApproach": "Quantify energy cost savings from optimization analytics", "riskLevel": "low-medium"}),
      pipelineStage: "New", isFavorite: true, outreachStatus: "Not Contacted",
      tags: JSON.stringify(["datacenter", "infrastructure", "enterprise"]),
      notes: [], activities: [],
    },
  ];

  // Insert leads with orgId
  console.log(`📝 Seeding ${leads.length} leads...`);

  for (const lead of leads) {
    const createdLead = await prisma.lead.upsert({
      where: { id: `lead-${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}` },
      update: {},
      create: {
        id: `lead-${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        orgId: org.id,
        companyName: lead.companyName,
        industry: lead.industry,
        website: lead.website,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        country: lead.country,
        postalCode: lead.postalCode,
        phone: lead.phone,
        email: lead.email,
        linkedinUrl: lead.linkedinUrl,
        companySize: lead.companySize,
        estimatedRevenue: lead.estimatedRevenue,
        employeeCount: lead.employeeCount,
        googleRating: lead.googleRating,
        reviewCount: lead.reviewCount,
        yearsInBusiness: lead.yearsInBusiness,
        businessCategory: lead.businessCategory,
        decisionMaker: lead.decisionMaker,
        decisionMakerTitle: lead.decisionMakerTitle,
        latitude: lead.latitude,
        longitude: lead.longitude,
        leadScore: lead.leadScore,
        digitalMaturity: lead.digitalMaturity,
        growthPotential: lead.growthPotential,
        operationalComplexity: lead.operationalComplexity,
        dataVolumeIndicators: lead.dataVolumeIndicators,
        marketingSophistication: lead.marketingSophistication,
        confidenceScore: lead.confidenceScore,
        urgencyScore: lead.urgencyScore,
        estimatedProjectValue: lead.estimatedProjectValue,
        businessSummary: lead.businessSummary,
        painPoints: lead.painPoints,
        analyticsOpportunities: lead.analyticsOpportunities,
        recommendedServices: lead.recommendedServices,
        aiInsights: lead.aiInsights,
        pipelineStage: lead.pipelineStage,
        isFavorite: lead.isFavorite,
        outreachStatus: lead.outreachStatus,
        tags: lead.tags,
        assignedTo: demoUser.id,
        createdBy: demoUser.id,
      },
    });

    // Create notes
    for (const note of lead.notes) {
      await prisma.note.upsert({
        where: { id: `note-${createdLead.id}-${note.content.slice(0, 20).replace(/\s/g, '-')}` },
        update: {},
        create: {
          id: `note-${createdLead.id}-${note.content.slice(0, 20).replace(/\s/g, '-')}`,
          content: note.content,
          leadId: createdLead.id,
          authorId: demoUser.id,
        },
      });
    }

    // Create activities
    for (const activity of lead.activities) {
      await prisma.activity.upsert({
        where: { id: `activity-${createdLead.id}-${activity.title.slice(0, 20).replace(/\s/g, '-')}` },
        update: {},
        create: {
          id: `activity-${createdLead.id}-${activity.title.slice(0, 20).replace(/\s/g, '-')}`,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          leadId: createdLead.id,
          userId: demoUser.id,
        },
      });
    }
  }

  console.log(`✅ Seeded ${leads.length} leads with notes and activities`);
  console.log("\n🎉 Seed complete!");
  console.log("\n📧 Demo Accounts:");
  console.log("   Owner:    admin@leadfinder.ai / demo1234");
  console.log("   Analyst:  analyst@leadfinder.ai / demo1234");
  console.log("   Viewer:   viewer@leadfinder.ai / demo1234");
  console.log("\n🏢 Organization: DataFlow Analytics (Professional plan, 2000 credits/mo)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });