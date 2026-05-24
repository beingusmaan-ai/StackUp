import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface TemplateTaskDef {
  title: string;
  assignedRole?: string;
  priority?: string;
  estimatedHours?: number;
  dayOffset?: number;
  description?: string;
  checklist?: string[];
}

interface TemplateGroupDef {
  name: string;
  color: string;
  tasks: TemplateTaskDef[];
}

interface TemplateDef {
  name: string;
  description: string;
  category: string;
  estimatedDays: number;
  tags: string;
  groups: TemplateGroupDef[];
}

const TEMPLATES: TemplateDef[] = [
  {
    name: "Meta Ads Campaign",
    description: "End-to-end workflow for launching a Meta (Facebook/Instagram) ads campaign",
    category: "CAMPAIGN",
    estimatedDays: 21,
    tags: "meta, ads, paid, social",
    groups: [
      {
        name: "Creative Production",
        color: "#6366f1",
        tasks: [
          { title: "Write Ad Copy", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 4, dayOffset: 18, checklist: ["Hook written", "CTA added", "Brand tone reviewed", "3 copy variants ready"] },
          { title: "Design Creatives (Static)", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 6, dayOffset: 14, checklist: ["Brand guidelines applied", "Dimensions correct (1:1, 9:16, 1.91:1)", "Text overlay reviewed"] },
          { title: "Video Editing", assignedRole: "VIDEO_EDITOR", priority: "MEDIUM", estimatedHours: 8, dayOffset: 10, checklist: ["15s and 30s cuts ready", "Captions added", "Thumbnail selected"] },
        ],
      },
      {
        name: "Campaign Setup",
        color: "#e8170b",
        tasks: [
          { title: "Meta Ads Manager Setup", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 3, dayOffset: 7, checklist: ["Campaign objective set", "Audience targeting defined", "Placements selected", "Budget allocated"] },
          { title: "Tracking Pixel Verification", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 1, dayOffset: 6, checklist: ["Pixel fires on purchase", "Pixel fires on add-to-cart", "Test events passed"] },
        ],
      },
      {
        name: "Review & Launch",
        color: "#10b981",
        tasks: [
          { title: "QA Review", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 3, checklist: ["Copy approved", "Creatives approved", "Targeting confirmed", "Budget confirmed"] },
          { title: "Campaign Launch", assignedRole: "PERFORMANCE_MARKETER", priority: "URGENT", estimatedHours: 1, dayOffset: 0, checklist: ["Ads live in Ads Manager", "Status = Active", "Notifications enabled"] },
        ],
      },
      {
        name: "Reporting",
        color: "#f59e0b",
        tasks: [
          { title: "Performance Report (Day 3)", assignedRole: "PERFORMANCE_MARKETER", priority: "MEDIUM", estimatedHours: 2, checklist: ["CTR, CPC, ROAS captured", "Flagged underperformers"] },
          { title: "Final Campaign Report", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 3, checklist: ["All KPIs vs targets", "Creative performance breakdown", "Recommendations for next campaign"] },
        ],
      },
    ],
  },
  {
    name: "Blog Publishing",
    description: "Full workflow from keyword research to publishing a blog post",
    category: "TASK",
    estimatedDays: 10,
    tags: "blog, content, seo, writing",
    groups: [
      {
        name: "Research & Planning",
        color: "#3b82f6",
        tasks: [
          { title: "Keyword Research", assignedRole: "SEO_SPECIALIST", priority: "HIGH", estimatedHours: 2, dayOffset: 9, checklist: ["Primary keyword identified", "LSI keywords listed", "Search volume confirmed", "Competitor content reviewed"] },
          { title: "Article Outline", assignedRole: "CONTENT_WRITER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 8 },
        ],
      },
      {
        name: "Content Creation",
        color: "#6366f1",
        tasks: [
          { title: "Article Writing", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 6, dayOffset: 6, checklist: ["Word count 1,500–2,500", "H1/H2/H3 structure", "Keywords naturally integrated", "CTA included"] },
          { title: "Design Graphics & Thumbnails", assignedRole: "GRAPHIC_DESIGNER", priority: "MEDIUM", estimatedHours: 3, dayOffset: 4, checklist: ["Featured image created", "In-article infographics ready", "Dimensions: 1200x628px"] },
        ],
      },
      {
        name: "SEO & Publishing",
        color: "#10b981",
        tasks: [
          { title: "SEO Optimization", assignedRole: "SEO_SPECIALIST", priority: "HIGH", estimatedHours: 2, dayOffset: 2, checklist: ["Meta title ≤60 chars", "Meta description ≤160 chars", "Alt tags on all images", "Internal links added", "Schema markup"] },
          { title: "Publish & Promote", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0, checklist: ["Published on CMS", "Shared on all social channels", "Newsletter mention"] },
        ],
      },
    ],
  },
  {
    name: "Google Ads Campaign",
    description: "Structured workflow for Google Search, Display or Performance Max campaigns",
    category: "CAMPAIGN",
    estimatedDays: 14,
    tags: "google, ads, sem, ppc",
    groups: [
      {
        name: "Strategy & Keywords",
        color: "#4285f4",
        tasks: [
          { title: "Keyword Research & Match Types", assignedRole: "SEO_SPECIALIST", priority: "HIGH", estimatedHours: 3, dayOffset: 12, checklist: ["Exact, phrase, broad match types", "Negative keywords list", "Keyword grouping done"] },
          { title: "Ad Copy Writing", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 3, dayOffset: 10, checklist: ["3+ headlines per ad group", "2+ descriptions", "CTAs clear", "Character limits met"] },
        ],
      },
      {
        name: "Campaign Setup",
        color: "#e8170b",
        tasks: [
          { title: "Campaign & Ad Group Structure", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 4, dayOffset: 7 },
          { title: "Conversion Tracking Setup", assignedRole: "PERFORMANCE_MARKETER", priority: "URGENT", estimatedHours: 2, dayOffset: 5, checklist: ["Google Tag installed", "Conversion actions verified", "Test conversions passed"] },
          { title: "Bid Strategy & Budget Setup", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 1, dayOffset: 3 },
        ],
      },
      {
        name: "Review & Go Live",
        color: "#10b981",
        tasks: [
          { title: "Campaign Review & QA", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 1 },
          { title: "Launch Campaign", assignedRole: "PERFORMANCE_MARKETER", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0 },
        ],
      },
    ],
  },
  {
    name: "Reels / Short Video Production",
    description: "Instagram Reels or TikTok short-form video production workflow",
    category: "TASK",
    estimatedDays: 7,
    tags: "reels, video, tiktok, instagram, social",
    groups: [
      {
        name: "Pre-Production",
        color: "#ec4899",
        tasks: [
          { title: "Content Brief & Script", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 2, dayOffset: 6, checklist: ["Hook in first 3 seconds", "Key message defined", "CTA scripted", "Approved by manager"] },
          { title: "Storyboard", assignedRole: "GRAPHIC_DESIGNER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 5 },
        ],
      },
      {
        name: "Production & Post",
        color: "#6366f1",
        tasks: [
          { title: "Filming / Record", assignedRole: "VIDEO_EDITOR", priority: "HIGH", estimatedHours: 3, dayOffset: 4 },
          { title: "Video Editing", assignedRole: "VIDEO_EDITOR", priority: "HIGH", estimatedHours: 4, dayOffset: 2, checklist: ["Captions added", "Audio synced", "Color graded", "Aspect ratio 9:16"] },
          { title: "Thumbnail Design", assignedRole: "GRAPHIC_DESIGNER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 1 },
        ],
      },
      {
        name: "Publishing",
        color: "#10b981",
        tasks: [
          { title: "Schedule & Publish", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 0.5, dayOffset: 0, checklist: ["Caption written", "Hashtags added", "Scheduled at peak time", "Posted to all platforms"] },
        ],
      },
    ],
  },
  {
    name: "SEO Audit",
    description: "Comprehensive technical and content SEO audit workflow",
    category: "TASK",
    estimatedDays: 14,
    tags: "seo, technical, audit, website",
    groups: [
      {
        name: "Technical SEO",
        color: "#14b8a6",
        tasks: [
          { title: "Crawl Analysis (Screaming Frog)", assignedRole: "SEO_SPECIALIST", priority: "HIGH", estimatedHours: 3, dayOffset: 12, checklist: ["Crawl errors identified", "Redirect chains checked", "Canonicals validated"] },
          { title: "Core Web Vitals Check", assignedRole: "SEO_SPECIALIST", priority: "HIGH", estimatedHours: 2, dayOffset: 10 },
          { title: "Mobile Usability Review", assignedRole: "SEO_SPECIALIST", priority: "MEDIUM", estimatedHours: 1, dayOffset: 9 },
        ],
      },
      {
        name: "On-Page SEO",
        color: "#6366f1",
        tasks: [
          { title: "Title Tag & Meta Description Audit", assignedRole: "SEO_SPECIALIST", priority: "HIGH", estimatedHours: 3, dayOffset: 7 },
          { title: "Content Gap Analysis", assignedRole: "CONTENT_WRITER", priority: "MEDIUM", estimatedHours: 4, dayOffset: 5 },
          { title: "Internal Linking Audit", assignedRole: "SEO_SPECIALIST", priority: "MEDIUM", estimatedHours: 2, dayOffset: 4 },
        ],
      },
      {
        name: "Reporting",
        color: "#f59e0b",
        tasks: [
          { title: "Audit Report & Recommendations", assignedRole: "SEO_SPECIALIST", priority: "HIGH", estimatedHours: 4, dayOffset: 1, checklist: ["Prioritized action list", "Quick wins highlighted", "Timeline estimate"] },
        ],
      },
    ],
  },
  {
    name: "Email Campaign",
    description: "Email newsletter or promotional campaign from planning to send",
    category: "CAMPAIGN",
    estimatedDays: 7,
    tags: "email, crm, newsletter, drip",
    groups: [
      {
        name: "Strategy & Copy",
        color: "#6366f1",
        tasks: [
          { title: "Campaign Brief & Goal Setting", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 1, dayOffset: 6 },
          { title: "Email Copywriting", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 3, dayOffset: 5, checklist: ["Subject line (A/B variants)", "Preview text", "Body copy", "CTA button text"] },
          { title: "Email Design (Template)", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 4, dayOffset: 4 },
        ],
      },
      {
        name: "Build & Test",
        color: "#e8170b",
        tasks: [
          { title: "Build in Email Platform", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 2, dayOffset: 3 },
          { title: "QA — Test Send & Render Test", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 1, dayOffset: 2, checklist: ["Renders on mobile", "Renders on desktop", "All links working", "Unsubscribe link present"] },
        ],
      },
      {
        name: "Send",
        color: "#10b981",
        tasks: [
          { title: "Segment & Schedule Send", assignedRole: "CRM_EMAIL_MARKETER", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0 },
        ],
      },
    ],
  },
  {
    name: "Influencer Campaign",
    description: "End-to-end influencer marketing campaign management",
    category: "CAMPAIGN",
    estimatedDays: 21,
    tags: "influencer, ugc, brand, collaboration",
    groups: [
      {
        name: "Sourcing & Outreach",
        color: "#8b5cf6",
        tasks: [
          { title: "Influencer Research & Shortlist", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 4, dayOffset: 18, checklist: ["Audience demographics match", "Engagement rate >2%", "Brand-safe content history"] },
          { title: "Outreach & Negotiation", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 14 },
          { title: "Contract & Brief Send", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 12 },
        ],
      },
      {
        name: "Content Review",
        color: "#e8170b",
        tasks: [
          { title: "Review Draft Content", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 2, dayOffset: 5, checklist: ["Brand mentions correct", "Disclosure #ad added", "No competitor mentions"] },
          { title: "Approve for Publishing", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 0.5, dayOffset: 2 },
        ],
      },
      {
        name: "Post-Campaign",
        color: "#10b981",
        tasks: [
          { title: "Performance Tracking", assignedRole: "PERFORMANCE_MARKETER", priority: "MEDIUM", estimatedHours: 2, dayOffset: -7 },
          { title: "Campaign Report", assignedRole: "MARKETING_MANAGER", priority: "MEDIUM", estimatedHours: 2 },
        ],
      },
    ],
  },
  {
    name: "Landing Page Launch",
    description: "From design to go-live — full landing page production workflow",
    category: "CAMPAIGN",
    estimatedDays: 14,
    tags: "landing page, website, design, conversion",
    groups: [
      {
        name: "Strategy & Wireframe",
        color: "#f59e0b",
        tasks: [
          { title: "Define Goal & CTA", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 13 },
          { title: "Copywriting — Hero, Body, CTA", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 4, dayOffset: 11 },
          { title: "Wireframe Design", assignedRole: "GRAPHIC_DESIGNER", priority: "MEDIUM", estimatedHours: 3, dayOffset: 9 },
        ],
      },
      {
        name: "Design & Development",
        color: "#6366f1",
        tasks: [
          { title: "Full Visual Design (Figma)", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 8, dayOffset: 6 },
          { title: "Development / CMS Build", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 6, dayOffset: 3 },
        ],
      },
      {
        name: "Testing & Go-Live",
        color: "#10b981",
        tasks: [
          { title: "QA & Conversion Tracking", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 2, dayOffset: 1, checklist: ["Form submission works", "Tracking fires", "Mobile responsive", "Page speed >90"] },
          { title: "Go Live", assignedRole: "MARKETING_MANAGER", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0 },
        ],
      },
    ],
  },
  {
    name: "Content Calendar Planning",
    description: "Monthly content calendar planning and scheduling workflow",
    category: "TASK",
    estimatedDays: 5,
    tags: "content, calendar, planning, social",
    groups: [
      {
        name: "Planning",
        color: "#14b8a6",
        tasks: [
          { title: "Monthly Themes & Campaign Alignment", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 4 },
          { title: "Content Ideation (All Platforms)", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 3, dayOffset: 3, checklist: ["Instagram posts", "LinkedIn posts", "TikTok/Reels", "Blog topics", "Email newsletter"] },
        ],
      },
      {
        name: "Scheduling",
        color: "#6366f1",
        tasks: [
          { title: "Fill Content Calendar in Tool", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "MEDIUM", estimatedHours: 2, dayOffset: 1 },
          { title: "Get Approval & Finalize", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0 },
        ],
      },
    ],
  },
  {
    name: "Client Reporting",
    description: "Weekly or monthly client performance report workflow",
    category: "TASK",
    estimatedDays: 3,
    tags: "reporting, client, analytics, kpi",
    groups: [
      {
        name: "Data Collection",
        color: "#3b82f6",
        tasks: [
          { title: "Pull Analytics Data", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 2, dayOffset: 2, checklist: ["GA4 data exported", "Meta Ads data exported", "Google Ads data exported", "Social insights captured"] },
          { title: "Compile KPIs vs Targets", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 1, dayOffset: 1 },
        ],
      },
      {
        name: "Report Build & Send",
        color: "#e8170b",
        tasks: [
          { title: "Build Report (Slides / Dashboard)", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 3, dayOffset: 0 },
          { title: "Write Executive Summary", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0, checklist: ["Key wins highlighted", "Issues flagged", "Next month recommendations"] },
          { title: "Send to Client / Stakeholders", assignedRole: "MARKETING_MANAGER", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0 },
        ],
      },
    ],
  },
];

async function main() {
  // Find or create a system user for built-in templates
  let systemUser = await db.user.findFirst({ where: { email: "system@arthurlawrence.net" } });
  if (!systemUser) {
    // Use the first admin user instead
    systemUser = await db.user.findFirst({ where: { role: "ADMIN" } });
  }
  if (!systemUser) {
    console.error("No admin user found. Run the main seed first.");
    process.exit(1);
  }

  console.log(`Seeding templates with creator: ${systemUser.name}`);

  // Delete existing built-in templates
  await db.taskTemplate.deleteMany({ where: { isBuiltIn: true } });

  for (const tmpl of TEMPLATES) {
    const created = await db.taskTemplate.create({
      data: {
        name: tmpl.name,
        description: tmpl.description,
        category: tmpl.category,
        estimatedDays: tmpl.estimatedDays,
        tags: tmpl.tags,
        isBuiltIn: true,
        isArchived: false,
        createdById: systemUser.id,
        groups: {
          create: tmpl.groups.map((g, gi) => ({
            name: g.name,
            color: g.color,
            position: gi,
            tasks: {
              create: g.tasks.map((t, ti) => ({
                title: t.title,
                description: t.description ?? null,
                assignedRole: t.assignedRole ?? null,
                priority: t.priority ?? "MEDIUM",
                estimatedHours: t.estimatedHours ?? null,
                dayOffset: t.dayOffset ?? null,
                position: ti,
                checklist: t.checklist && t.checklist.length > 0
                  ? {
                      create: t.checklist.map((text, ci) => ({ text, position: ci })),
                    }
                  : undefined,
              })),
            },
          })),
        },
      },
    });
    console.log(`  ✓ ${created.name}`);
  }

  console.log(`\n✅ Seeded ${TEMPLATES.length} built-in templates`);
}

main().catch(console.error).finally(() => db.$disconnect());
