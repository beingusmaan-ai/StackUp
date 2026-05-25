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
  department?: string; // department name key
}

// ─── General templates (no department) ───────────────────────────────────────

const GENERAL_TEMPLATES: TemplateDef[] = [
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

// ─── Department-specific templates ───────────────────────────────────────────

const DEPT_TEMPLATES: TemplateDef[] = [
  // ── Marketing ──────────────────────────────────────────────────────────────
  {
    name: "Product Launch Campaign",
    description: "Full multi-channel launch — from strategy to post-launch analysis",
    category: "CAMPAIGN",
    estimatedDays: 30,
    tags: "launch, product, multi-channel, marketing",
    department: "Marketing",
    groups: [
      {
        name: "Strategy",
        color: "#6366f1",
        tasks: [
          { title: "Define Launch Goals & KPIs", assignedRole: "MARKETING_MANAGER", priority: "URGENT", estimatedHours: 2, dayOffset: 28, checklist: ["Revenue target set", "Traffic goal set", "Launch date confirmed"] },
          { title: "Audience & Messaging Research", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 3, dayOffset: 26 },
          { title: "Channel Plan (Paid, Organic, Email)", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 24 },
        ],
      },
      {
        name: "Creative Production",
        color: "#e8170b",
        tasks: [
          { title: "Launch Copy — All Channels", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 6, dayOffset: 20, checklist: ["Hero headline", "Ad copy variants", "Email copy", "Social captions"] },
          { title: "Visual Assets — Static & Video", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 10, dayOffset: 16 },
          { title: "Video Teaser / Hero Video", assignedRole: "VIDEO_EDITOR", priority: "HIGH", estimatedHours: 8, dayOffset: 12 },
        ],
      },
      {
        name: "Campaign Setup",
        color: "#f59e0b",
        tasks: [
          { title: "Paid Ads Setup (Meta + Google)", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 5, dayOffset: 7 },
          { title: "Email Launch Sequence Built", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 3, dayOffset: 5 },
          { title: "Social Posts Scheduled", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 3 },
        ],
      },
      {
        name: "Launch & Post-Launch",
        color: "#10b981",
        tasks: [
          { title: "Go-Live Checklist Sign-off", assignedRole: "MARKETING_MANAGER", priority: "URGENT", estimatedHours: 1, dayOffset: 1, checklist: ["All channels live", "Tracking verified", "Team notified"] },
          { title: "Day-1 Performance Check", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 1, dayOffset: 0 },
          { title: "Week-1 Launch Report", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2 },
        ],
      },
    ],
  },
  {
    name: "Brand Awareness Campaign",
    description: "Top-of-funnel awareness push across paid, social, and PR channels",
    category: "CAMPAIGN",
    estimatedDays: 21,
    tags: "brand, awareness, top-of-funnel, PR",
    department: "Marketing",
    groups: [
      {
        name: "Strategy & Messaging",
        color: "#8b5cf6",
        tasks: [
          { title: "Brand Messaging Framework", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 19 },
          { title: "Target Audience Personas", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 2, dayOffset: 17 },
        ],
      },
      {
        name: "Creative Assets",
        color: "#6366f1",
        tasks: [
          { title: "Brand Story Video (60s)", assignedRole: "VIDEO_EDITOR", priority: "HIGH", estimatedHours: 12, dayOffset: 14, checklist: ["Script approved", "VO recorded", "B-roll captured", "Color graded"] },
          { title: "Display & Social Creatives", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 8, dayOffset: 10 },
          { title: "PR Press Kit", assignedRole: "CONTENT_WRITER", priority: "MEDIUM", estimatedHours: 4, dayOffset: 8, checklist: ["Company overview", "Key stats", "Brand assets included", "Media contacts list"] },
        ],
      },
      {
        name: "Distribution & Reporting",
        color: "#10b981",
        tasks: [
          { title: "Paid Media Launch (Display / YouTube)", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 3, dayOffset: 3 },
          { title: "PR Outreach to Media / Blogs", assignedRole: "MARKETING_MANAGER", priority: "MEDIUM", estimatedHours: 2, dayOffset: 2 },
          { title: "Campaign Reach & Impression Report", assignedRole: "PERFORMANCE_MARKETER", priority: "MEDIUM", estimatedHours: 2 },
        ],
      },
    ],
  },
  {
    name: "Quarterly Marketing Review",
    description: "End-of-quarter performance review, insights, and planning for next quarter",
    category: "TASK",
    estimatedDays: 5,
    tags: "quarterly, review, planning, OKR",
    department: "Marketing",
    groups: [
      {
        name: "Data Pull",
        color: "#3b82f6",
        tasks: [
          { title: "Compile All Channel Performance Data", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 4, dayOffset: 4, checklist: ["Paid ads data", "Organic / SEO data", "Email metrics", "Social metrics", "Website analytics"] },
          { title: "Revenue & Pipeline Attribution", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 3 },
        ],
      },
      {
        name: "Analysis & Presentation",
        color: "#6366f1",
        tasks: [
          { title: "Insights & What-Worked Summary", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 2, checklist: ["Top 3 wins", "Top 3 learnings", "Spend efficiency"] },
          { title: "Build Quarterly Review Deck", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 4, dayOffset: 1 },
          { title: "Next Quarter OKR Draft", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 0, checklist: ["Objectives aligned to business goals", "KPIs measurable", "Budget estimate included"] },
        ],
      },
    ],
  },

  // ── Marketing (additional 7) ───────────────────────────────────────────────
  {
    name: "Social Media Growth Campaign",
    description: "Structured 30-day organic growth push across Instagram, LinkedIn, and TikTok",
    category: "CAMPAIGN",
    estimatedDays: 30,
    tags: "social media, organic, growth, engagement",
    department: "Marketing",
    groups: [
      {
        name: "Strategy",
        color: "#8b5cf6",
        tasks: [
          { title: "Audit Current Social Accounts", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 29, checklist: ["Follower count & growth rate", "Engagement rate per platform", "Top performing content", "Competitor benchmarks"] },
          { title: "Set Growth Goals & Content Pillars", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 27 },
        ],
      },
      {
        name: "Content Production",
        color: "#e8170b",
        tasks: [
          { title: "Monthly Content Calendar", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 25, checklist: ["30 days planned", "Mix of formats: carousel, reel, static, story"] },
          { title: "Design Branded Templates", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 5, dayOffset: 22, checklist: ["Feed posts template", "Story template", "Reel cover template"] },
          { title: "Batch Write Captions & Hashtags", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 4, dayOffset: 18 },
          { title: "Shoot & Edit Week 1 Content", assignedRole: "VIDEO_EDITOR", priority: "HIGH", estimatedHours: 6, dayOffset: 14 },
        ],
      },
      {
        name: "Scheduling & Engagement",
        color: "#10b981",
        tasks: [
          { title: "Schedule All Posts in Scheduling Tool", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "MEDIUM", estimatedHours: 2, dayOffset: 7 },
          { title: "Daily Community Engagement (DMs, Comments)", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0 },
          { title: "End-of-Month Growth Report", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 2, checklist: ["Follower growth", "Reach & impressions", "Engagement rate", "Top 3 posts"] },
        ],
      },
    ],
  },
  {
    name: "Webinar / Event Marketing",
    description: "Plan, promote, and execute a virtual event or webinar from registration to replay",
    category: "CAMPAIGN",
    estimatedDays: 21,
    tags: "webinar, event, registration, lead gen",
    department: "Marketing",
    groups: [
      {
        name: "Planning",
        color: "#6366f1",
        tasks: [
          { title: "Define Topic, Speaker & Date", assignedRole: "MARKETING_MANAGER", priority: "URGENT", estimatedHours: 2, dayOffset: 20, checklist: ["Topic validated with audience", "Speaker confirmed", "Platform chosen (Zoom/Hopin)"] },
          { title: "Registration Page Copywriting", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 2, dayOffset: 18 },
          { title: "Registration Page Design & Setup", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 3, dayOffset: 16, checklist: ["Registration form live", "Confirmation email automated", "Calendar invite triggered"] },
        ],
      },
      {
        name: "Promotion",
        color: "#f59e0b",
        tasks: [
          { title: "Email Invitations (3-touch sequence)", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 3, dayOffset: 14, checklist: ["Save-the-date email", "Reminder 1 week before", "Day-before reminder"] },
          { title: "Social Media Promotion Posts", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 12 },
          { title: "Paid Ads for Registration (optional)", assignedRole: "PERFORMANCE_MARKETER", priority: "MEDIUM", estimatedHours: 2, dayOffset: 10 },
        ],
      },
      {
        name: "Event Day & Follow-up",
        color: "#10b981",
        tasks: [
          { title: "Event Day Tech Check & Run of Show", assignedRole: "MARKETING_MANAGER", priority: "URGENT", estimatedHours: 2, dayOffset: 0, checklist: ["Audio/video tested", "Recording started", "Q&A moderation assigned"] },
          { title: "Post-Event Email with Replay Link", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 1 },
          { title: "Leads Follow-up Sequence", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 2, checklist: ["Attended segment", "Registered-but-missed segment"] },
        ],
      },
    ],
  },
  {
    name: "Email Newsletter Programme",
    description: "Set up and launch an ongoing email newsletter from scratch",
    category: "CAMPAIGN",
    estimatedDays: 14,
    tags: "email, newsletter, subscriber, CRM",
    department: "Marketing",
    groups: [
      {
        name: "Setup",
        color: "#3b82f6",
        tasks: [
          { title: "Choose Platform & Set Up Account", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 2, dayOffset: 13, checklist: ["Domain authenticated (SPF/DKIM)", "Unsubscribe flow configured", "List imported / segments created"] },
          { title: "Newsletter Template Design", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 4, dayOffset: 10, checklist: ["Header with logo", "Content sections", "Footer with unsubscribe", "Mobile responsive"] },
        ],
      },
      {
        name: "Content & Launch",
        color: "#e8170b",
        tasks: [
          { title: "Define Newsletter Format & Cadence", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 8 },
          { title: "Write Issue #1", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 3, dayOffset: 5, checklist: ["Subject line A/B test", "Preview text", "2–3 content sections", "CTA link"] },
          { title: "QA Send & Inbox Testing", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 1, dayOffset: 1 },
          { title: "Send Issue #1 & Track Results", assignedRole: "CRM_EMAIL_MARKETER", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0 },
        ],
      },
    ],
  },
  {
    name: "Competitor & Market Analysis",
    description: "Deep-dive competitor research and market positioning report",
    category: "TASK",
    estimatedDays: 10,
    tags: "research, competitive intelligence, market, positioning",
    department: "Marketing",
    groups: [
      {
        name: "Research",
        color: "#6366f1",
        tasks: [
          { title: "Identify Top 5–10 Competitors", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 9 },
          { title: "Analyse Competitor Websites & Messaging", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 4, dayOffset: 7, checklist: ["Homepage positioning", "Pricing page", "USPs", "CTA strategy"] },
          { title: "Social & Content Audit (Competitors)", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "MEDIUM", estimatedHours: 3, dayOffset: 5 },
          { title: "SEO Gap Analysis vs Competitors", assignedRole: "SEO_SPECIALIST", priority: "HIGH", estimatedHours: 3, dayOffset: 4, checklist: ["Keyword gaps identified", "Backlink authority compared", "Content topics missing"] },
        ],
      },
      {
        name: "Report & Recommendations",
        color: "#f59e0b",
        tasks: [
          { title: "Compile Findings into Report", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 4, dayOffset: 1, checklist: ["SWOT analysis included", "Market positioning map", "Opportunity areas highlighted"] },
          { title: "Present to Leadership", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0 },
        ],
      },
    ],
  },
  {
    name: "PR & Media Coverage",
    description: "Pitch and secure media coverage for a company announcement or milestone",
    category: "CAMPAIGN",
    estimatedDays: 14,
    tags: "PR, media, press release, earned media",
    department: "Marketing",
    groups: [
      {
        name: "Preparation",
        color: "#8b5cf6",
        tasks: [
          { title: "Define Announcement & Key Message", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 13 },
          { title: "Write Press Release", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 3, dayOffset: 11, checklist: ["Strong headline", "Quote from leadership", "Facts & stats", "Boilerplate", "Contact details"] },
          { title: "Build Media Contact List", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 9, checklist: ["Trade publications", "Local business press", "Relevant bloggers / podcasters"] },
        ],
      },
      {
        name: "Outreach & Coverage",
        color: "#e8170b",
        tasks: [
          { title: "Pitch Email to Journalists", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 7 },
          { title: "Follow-up Pitches", assignedRole: "MARKETING_MANAGER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 4 },
          { title: "Track Coverage & Mentions", assignedRole: "CONTENT_WRITER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 0, checklist: ["Coverage logged", "Links saved", "Reach / DA noted"] },
        ],
      },
    ],
  },
  {
    name: "Podcast Production",
    description: "End-to-end podcast episode workflow from guest booking to publishing",
    category: "TASK",
    estimatedDays: 7,
    tags: "podcast, audio, content, brand",
    department: "Marketing",
    groups: [
      {
        name: "Pre-Production",
        color: "#f59e0b",
        tasks: [
          { title: "Guest Research & Outreach", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 2, dayOffset: 6, checklist: ["Guest background researched", "Intro email sent", "Recording date confirmed"] },
          { title: "Episode Brief & Question List", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 1, dayOffset: 5 },
        ],
      },
      {
        name: "Recording & Editing",
        color: "#6366f1",
        tasks: [
          { title: "Record Episode", assignedRole: "VIDEO_EDITOR", priority: "HIGH", estimatedHours: 2, dayOffset: 3, checklist: ["Both audio tracks clean", "Recording saved", "Backup copy made"] },
          { title: "Audio Edit & Mastering", assignedRole: "VIDEO_EDITOR", priority: "HIGH", estimatedHours: 3, dayOffset: 1, checklist: ["Intro/outro added", "Volume normalised", "Silences trimmed", "Export MP3 320kbps"] },
        ],
      },
      {
        name: "Publishing",
        color: "#10b981",
        tasks: [
          { title: "Write Show Notes & Episode Title", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 1, dayOffset: 0 },
          { title: "Upload & Publish to Podcast Platforms", assignedRole: "SOCIAL_MEDIA_MANAGER", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0, checklist: ["Spotify", "Apple Podcasts", "Website embed", "Social teaser clip posted"] },
        ],
      },
    ],
  },
  {
    name: "Affiliate / Referral Programme Launch",
    description: "Design and launch a customer referral or affiliate marketing programme",
    category: "CAMPAIGN",
    estimatedDays: 21,
    tags: "affiliate, referral, partnership, growth",
    department: "Marketing",
    groups: [
      {
        name: "Programme Design",
        color: "#3b82f6",
        tasks: [
          { title: "Define Commission Structure & Rules", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 20, checklist: ["Commission % / flat rate", "Cookie duration", "Payout schedule", "Eligible products/services"] },
          { title: "Choose & Set Up Affiliate Platform", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 4, dayOffset: 16, checklist: ["Tracking links configured", "Dashboard access for affiliates", "Payment method connected"] },
        ],
      },
      {
        name: "Assets & Recruitment",
        color: "#e8170b",
        tasks: [
          { title: "Create Affiliate Toolkit (Copy, Banners, Links)", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 5, dayOffset: 12, checklist: ["Banner ads (various sizes)", "Email swipes", "Social post templates"] },
          { title: "Recruit First 10 Affiliates / Partners", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 4, dayOffset: 8 },
        ],
      },
      {
        name: "Launch & Monitor",
        color: "#10b981",
        tasks: [
          { title: "Programme Go-Live Announcement", assignedRole: "CRM_EMAIL_MARKETER", priority: "HIGH", estimatedHours: 2, dayOffset: 0 },
          { title: "Month-1 Performance Review", assignedRole: "PERFORMANCE_MARKETER", priority: "HIGH", estimatedHours: 2, checklist: ["Active affiliates", "Clicks & conversions", "Revenue attributed", "Top performers"] },
        ],
      },
    ],
  },

  // ── Sales ───────────────────────────────────────────────────────────────────
  {
    name: "Outbound Sales Sequence",
    description: "Structured cold-to-close outreach workflow for a target account list",
    category: "CAMPAIGN",
    estimatedDays: 21,
    tags: "outbound, cold outreach, SDR, prospecting",
    department: "Sales",
    groups: [
      {
        name: "Prospecting",
        color: "#3b82f6",
        tasks: [
          { title: "Build Target Account List (TAL)", assignedRole: "BUSINESS_DEVELOPMENT", priority: "HIGH", estimatedHours: 4, dayOffset: 20, checklist: ["ICP criteria defined", "100+ accounts identified", "LinkedIn verified", "Contact emails enriched"] },
          { title: "Research & Personalisation Notes", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 3, dayOffset: 17 },
        ],
      },
      {
        name: "Outreach",
        color: "#e8170b",
        tasks: [
          { title: "Write Cold Email Sequence (5 touch)", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 3, dayOffset: 14, checklist: ["Hook / pain point", "Value proposition", "Social proof", "CTA — calendar link"] },
          { title: "LinkedIn Connection + Message Campaign", assignedRole: "SALES_REP", priority: "MEDIUM", estimatedHours: 2, dayOffset: 12 },
          { title: "Launch Sequence in CRM", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 1, dayOffset: 10 },
        ],
      },
      {
        name: "Follow-up & Close",
        color: "#10b981",
        tasks: [
          { title: "Follow-up Calls — Engaged Prospects", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 4, dayOffset: 7, checklist: ["Pain points documented", "Demo scheduled or reason logged"] },
          { title: "Demo / Discovery Calls", assignedRole: "ACCOUNT_EXECUTIVE", priority: "URGENT", estimatedHours: 5, dayOffset: 4 },
          { title: "Proposal Send & Negotiation", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 3, dayOffset: 1 },
          { title: "Sequence Results Report", assignedRole: "SALES_MANAGER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 0, checklist: ["Open rate", "Reply rate", "Meetings booked", "Pipeline added ($)"] },
        ],
      },
    ],
  },
  {
    name: "Client Proposal & Pitch",
    description: "Research, write, design, and deliver a winning client proposal",
    category: "TASK",
    estimatedDays: 7,
    tags: "proposal, pitch, deck, client",
    department: "Sales",
    groups: [
      {
        name: "Discovery & Research",
        color: "#6366f1",
        tasks: [
          { title: "Discovery Call Notes & Pain Points", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 1, dayOffset: 6, checklist: ["Budget range confirmed", "Decision maker identified", "Timeline noted", "Key pain points documented"] },
          { title: "Competitive Landscape Research", assignedRole: "BUSINESS_DEVELOPMENT", priority: "MEDIUM", estimatedHours: 2, dayOffset: 5 },
        ],
      },
      {
        name: "Proposal Creation",
        color: "#e8170b",
        tasks: [
          { title: "Write Proposal Content", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 4, dayOffset: 4, checklist: ["Executive summary", "Proposed solution", "Pricing / packages", "ROI estimate", "Case study included"] },
          { title: "Design Pitch Deck", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 5, dayOffset: 2, checklist: ["On-brand slides", "Max 15 slides", "Clear CTA slide"] },
          { title: "Internal Review & Sign-off", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 1 },
        ],
      },
      {
        name: "Delivery & Follow-up",
        color: "#10b981",
        tasks: [
          { title: "Proposal Send + Pitch Presentation", assignedRole: "ACCOUNT_EXECUTIVE", priority: "URGENT", estimatedHours: 2, dayOffset: 0, checklist: ["Deck shared via link", "Email sent", "Follow-up date set in CRM"] },
        ],
      },
    ],
  },
  {
    name: "Quarterly Business Review (QBR)",
    description: "Prepare and deliver a quarterly business review with key accounts",
    category: "TASK",
    estimatedDays: 5,
    tags: "QBR, account management, client, review",
    department: "Sales",
    groups: [
      {
        name: "Data Preparation",
        color: "#f59e0b",
        tasks: [
          { title: "Pull Account Performance Data", assignedRole: "ACCOUNT_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 4, checklist: ["Usage / adoption metrics", "Revenue vs target", "Support tickets summary", "NPS / satisfaction score"] },
          { title: "Identify Upsell / Expansion Opportunities", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 1, dayOffset: 3 },
        ],
      },
      {
        name: "Presentation",
        color: "#6366f1",
        tasks: [
          { title: "Build QBR Deck", assignedRole: "ACCOUNT_MANAGER", priority: "HIGH", estimatedHours: 4, dayOffset: 2, checklist: ["Wins since last QBR", "Challenges & actions", "Roadmap preview", "Renewal / expansion ask"] },
          { title: "Internal Dry Run", assignedRole: "SALES_MANAGER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 1 },
        ],
      },
      {
        name: "Meeting & Next Steps",
        color: "#10b981",
        tasks: [
          { title: "QBR Meeting with Client", assignedRole: "ACCOUNT_EXECUTIVE", priority: "URGENT", estimatedHours: 2, dayOffset: 0 },
          { title: "Send Meeting Summary & Action Items", assignedRole: "ACCOUNT_MANAGER", priority: "HIGH", estimatedHours: 0.5 },
        ],
      },
    ],
  },

  // ── Sales (additional 7) ───────────────────────────────────────────────────
  {
    name: "Deal Acceleration & Closing",
    description: "Structured process to move a stalled deal from negotiation to signed contract",
    category: "TASK",
    estimatedDays: 10,
    tags: "closing, deal, negotiation, contract",
    department: "Sales",
    groups: [
      {
        name: "Deal Review",
        color: "#e8170b",
        tasks: [
          { title: "Deal Health Assessment", assignedRole: "ACCOUNT_EXECUTIVE", priority: "URGENT", estimatedHours: 1, dayOffset: 9, checklist: ["Decision maker engaged", "Budget confirmed", "Timeline confirmed", "Blockers identified"] },
          { title: "Internal Strategy Session", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 8, checklist: ["Concession limits agreed", "Champion identified", "Multi-threading plan"] },
        ],
      },
      {
        name: "Acceleration Actions",
        color: "#f59e0b",
        tasks: [
          { title: "Executive Sponsor Outreach", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 7 },
          { title: "Send Personalised Business Case / ROI Doc", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 3, dayOffset: 5, checklist: ["ROI numbers customer-specific", "Implementation timeline shown", "Risk mitigation covered"] },
          { title: "Final Proof of Concept / Demo (if needed)", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 2, dayOffset: 3 },
        ],
      },
      {
        name: "Close",
        color: "#10b981",
        tasks: [
          { title: "Send Contract / Proposal", assignedRole: "ACCOUNT_EXECUTIVE", priority: "URGENT", estimatedHours: 1, dayOffset: 1, checklist: ["Legal reviewed", "E-signature link sent", "Expiry date on offer"] },
          { title: "Follow Up & Confirm Signature", assignedRole: "ACCOUNT_EXECUTIVE", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0 },
          { title: "Log Won Deal in CRM & Handover to AM", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 0.5 },
        ],
      },
    ],
  },
  {
    name: "Account Expansion & Upsell",
    description: "Identify and execute upsell/cross-sell opportunities within existing accounts",
    category: "TASK",
    estimatedDays: 14,
    tags: "upsell, expansion, account management, revenue",
    department: "Sales",
    groups: [
      {
        name: "Account Analysis",
        color: "#6366f1",
        tasks: [
          { title: "Account Health & Usage Review", assignedRole: "ACCOUNT_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 13, checklist: ["Usage trends reviewed", "NPS / satisfaction score", "Renewal date noted", "Current ARR logged"] },
          { title: "Identify Expansion Opportunities", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 2, dayOffset: 11, checklist: ["Product gaps identified", "Additional seats opportunity", "Add-on services applicable"] },
        ],
      },
      {
        name: "Pitch & Proposal",
        color: "#e8170b",
        tasks: [
          { title: "Tailored Expansion Proposal", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 3, dayOffset: 7, checklist: ["ROI based on their actual usage", "Current vs proposed package comparison", "Pricing & terms clear"] },
          { title: "Upsell Meeting / Call with Champion", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 1, dayOffset: 4 },
        ],
      },
      {
        name: "Close & Onboard",
        color: "#10b981",
        tasks: [
          { title: "Contract Amendment Signed", assignedRole: "ACCOUNT_EXECUTIVE", priority: "URGENT", estimatedHours: 0.5, dayOffset: 1 },
          { title: "New Feature / Tier Onboarding Call", assignedRole: "ACCOUNT_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0 },
          { title: "Update CRM with Expanded ARR", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 0.5 },
        ],
      },
    ],
  },
  {
    name: "Sales Enablement Pack",
    description: "Create a complete kit of sales assets — battlecards, decks, case studies, objection guides",
    category: "TASK",
    estimatedDays: 14,
    tags: "enablement, battlecard, sales assets, training",
    department: "Sales",
    groups: [
      {
        name: "Discovery & Brief",
        color: "#3b82f6",
        tasks: [
          { title: "Sales Team Needs Assessment", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 13, checklist: ["Common objections listed", "Competitor comparison gaps", "Prospect FAQs captured"] },
          { title: "Content Brief for Each Asset", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 11 },
        ],
      },
      {
        name: "Asset Creation",
        color: "#8b5cf6",
        tasks: [
          { title: "Competitor Battlecard (1 per key competitor)", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 4, dayOffset: 9, checklist: ["Their strengths / weaknesses", "Our counter-messaging", "Win themes"] },
          { title: "Objection Handling Guide", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 7 },
          { title: "Customer Case Study (PDF + 1-pager)", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 4, dayOffset: 5, checklist: ["Customer quote approved", "Before/after stats", "Industry & company size tagged"] },
          { title: "Sales Deck Update (Core Pitch)", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 5, dayOffset: 2 },
        ],
      },
      {
        name: "Training & Rollout",
        color: "#10b981",
        tasks: [
          { title: "Sales Training Session — New Assets", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 0, checklist: ["All reps attend or view recording", "Assets uploaded to shared drive", "Feedback collected"] },
        ],
      },
    ],
  },
  {
    name: "CRM Cleanup & Data Hygiene",
    description: "Audit, clean, and enrich CRM data to improve pipeline accuracy and reporting",
    category: "TASK",
    estimatedDays: 7,
    tags: "CRM, data, hygiene, pipeline, Salesforce",
    department: "Sales",
    groups: [
      {
        name: "Audit",
        color: "#e8170b",
        tasks: [
          { title: "Identify Duplicate Records", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 2, dayOffset: 6, checklist: ["Run deduplication report", "Flag duplicates for merge", "Assign owners"] },
          { title: "Review Stale Opportunities (>90 days)", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 5, checklist: ["Archive closed-lost", "Update stages on active deals", "Remove dead leads"] },
        ],
      },
      {
        name: "Enrichment & Fixes",
        color: "#6366f1",
        tasks: [
          { title: "Enrich Missing Contact Data", assignedRole: "BUSINESS_DEVELOPMENT", priority: "HIGH", estimatedHours: 4, dayOffset: 3, checklist: ["Email addresses verified", "Phone numbers added", "LinkedIn URLs added", "Company size & industry tagged"] },
          { title: "Standardise Field Values & Tags", assignedRole: "SALES_REP", priority: "MEDIUM", estimatedHours: 2, dayOffset: 1 },
        ],
      },
      {
        name: "Reporting Check",
        color: "#10b981",
        tasks: [
          { title: "Validate Pipeline Report Post-Cleanup", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0, checklist: ["Pipeline value accurate", "Stage distribution makes sense", "Forecast report reviewed"] },
        ],
      },
    ],
  },
  {
    name: "New Market Entry",
    description: "Sales strategy and outreach plan for entering a new vertical or geographic market",
    category: "CAMPAIGN",
    estimatedDays: 30,
    tags: "market entry, new vertical, expansion, territory",
    department: "Sales",
    groups: [
      {
        name: "Market Research",
        color: "#3b82f6",
        tasks: [
          { title: "Target Market Definition (ICP for New Market)", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 28, checklist: ["Industry/vertical defined", "Company size range", "Geography scoped", "Key pain points mapped"] },
          { title: "Competitor Landscape in New Market", assignedRole: "BUSINESS_DEVELOPMENT", priority: "HIGH", estimatedHours: 3, dayOffset: 25 },
          { title: "Build Initial Target Account List", assignedRole: "BUSINESS_DEVELOPMENT", priority: "HIGH", estimatedHours: 4, dayOffset: 21, checklist: ["50+ accounts identified", "Contacts enriched", "Priority tier assigned"] },
        ],
      },
      {
        name: "Messaging & Assets",
        color: "#8b5cf6",
        tasks: [
          { title: "Tailor Pitch Messaging for New Market", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 3, dayOffset: 17, checklist: ["Industry-specific pain points", "Relevant case studies identified", "ROI metrics adjusted"] },
          { title: "Create Market-Specific One-Pager", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 4, dayOffset: 13 },
        ],
      },
      {
        name: "Outreach & Results",
        color: "#10b981",
        tasks: [
          { title: "Launch Outbound Sequence to TAL", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 3, dayOffset: 7 },
          { title: "First Discovery Calls in New Market", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 5, dayOffset: 4 },
          { title: "30-Day Market Entry Report", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 0, checklist: ["Pipeline generated", "Conversion rates vs existing markets", "Insights & iteration plan"] },
        ],
      },
    ],
  },
  {
    name: "Partner / Channel Sales Setup",
    description: "Onboard a new channel partner or reseller to drive indirect revenue",
    category: "CAMPAIGN",
    estimatedDays: 21,
    tags: "partner, channel, reseller, indirect sales",
    department: "Sales",
    groups: [
      {
        name: "Partner Onboarding",
        color: "#f59e0b",
        tasks: [
          { title: "Partner Agreement & NDA Signed", assignedRole: "SALES_MANAGER", priority: "URGENT", estimatedHours: 1, dayOffset: 20, checklist: ["Commission structure agreed", "Territory / exclusivity terms", "NDA signed"] },
          { title: "Partner Portal Access & Tools Setup", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 2, dayOffset: 17 },
          { title: "Partner Training on Product & ICP", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 3, dayOffset: 14, checklist: ["Product demo delivered", "Sales process walkthrough", "Resources shared"] },
        ],
      },
      {
        name: "Enablement",
        color: "#6366f1",
        tasks: [
          { title: "Create Partner Sales Kit", assignedRole: "CONTENT_WRITER", priority: "HIGH", estimatedHours: 4, dayOffset: 10, checklist: ["Partner pitch deck", "Objection handling", "Co-branded one-pager"] },
          { title: "Joint GTM Plan Agreed", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 7 },
        ],
      },
      {
        name: "Launch",
        color: "#10b981",
        tasks: [
          { title: "Partner Soft Launch — First Joint Outreach", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 2, dayOffset: 0 },
          { title: "30-Day Partner Performance Check-in", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1 },
        ],
      },
    ],
  },
  {
    name: "Sales Kickoff Preparation",
    description: "Plan and deliver a high-impact annual or quarterly sales kickoff event",
    category: "TASK",
    estimatedDays: 14,
    tags: "kickoff, SKO, event, sales team, enablement",
    department: "Sales",
    groups: [
      {
        name: "Planning",
        color: "#8b5cf6",
        tasks: [
          { title: "Define SKO Agenda & Themes", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 13, checklist: ["Key theme / narrative", "Breakout sessions planned", "Guest speakers confirmed", "Team awards included"] },
          { title: "Venue / Platform Booking (in-person or virtual)", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 11 },
        ],
      },
      {
        name: "Content & Materials",
        color: "#e8170b",
        tasks: [
          { title: "SKO Deck — State of the Business", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 5, dayOffset: 8 },
          { title: "Year/Quarter Goals & OKR Presentation", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 6, checklist: ["Revenue targets", "Team targets per rep", "Key initiatives & product updates"] },
          { title: "Training Workshop Materials", assignedRole: "ACCOUNT_EXECUTIVE", priority: "HIGH", estimatedHours: 3, dayOffset: 4 },
        ],
      },
      {
        name: "Event Day",
        color: "#10b981",
        tasks: [
          { title: "Run SKO Event", assignedRole: "SALES_MANAGER", priority: "URGENT", estimatedHours: 8, dayOffset: 0, checklist: ["Agenda followed", "Recording done (if virtual)", "Q&A captured"] },
          { title: "Send Post-SKO Summary & Resources", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 1 },
        ],
      },
    ],
  },

  // ── Sales (Department workflows) ────────────────────────────────────────────
  {
    name: "Sales Rep Onboarding",
    description: "30-day onboarding plan for a new sales hire — from day-one setup to first closed deal",
    category: "DEPARTMENT",
    estimatedDays: 30,
    tags: "onboarding, new hire, sales rep, training",
    department: "Sales",
    groups: [
      {
        name: "Week 1 — Setup & Orientation",
        color: "#3b82f6",
        tasks: [
          { title: "Set Up CRM Account & Tools Access", assignedRole: "SALES_MANAGER", priority: "URGENT", estimatedHours: 1, dayOffset: 29, checklist: ["CRM login created", "Email configured", "Slack added to channels", "Drive/Notion access granted"] },
          { title: "Company & Product Overview Session", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 28, checklist: ["Product demo watched", "Value proposition understood", "Pricing tiers reviewed"] },
          { title: "Shadow 2 Live Sales Calls", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 3, dayOffset: 26, checklist: ["Discovery call shadowed", "Demo call shadowed", "Notes taken and reviewed with manager"] },
        ],
      },
      {
        name: "Week 2 — Process & Playbook",
        color: "#8b5cf6",
        tasks: [
          { title: "Read & Acknowledge Sales Playbook", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 3, dayOffset: 22, checklist: ["ICP and personas reviewed", "Objection handling read", "Sequence steps understood"] },
          { title: "Complete CRM Data Entry Training", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 2, dayOffset: 21, checklist: ["Lead stages understood", "Activity logging practiced", "Pipeline view set up"] },
          { title: "Role-Play Practice: Discovery Call", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 19, checklist: ["Discovery questions practiced", "Feedback given", "Pass/retry recorded"] },
        ],
      },
      {
        name: "Week 3–4 — Ramping Up",
        color: "#10b981",
        tasks: [
          { title: "First 10 Outbound Prospects Identified", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 2, dayOffset: 14, checklist: ["Accounts match ICP", "Contacts enriched in CRM", "Personalisation notes added"] },
          { title: "First Live Discovery Call (Solo)", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 1, dayOffset: 10, checklist: ["Call logged in CRM", "Next step agreed with prospect", "Debrief with manager done"] },
          { title: "30-Day Onboarding Review with Manager", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0, checklist: ["KPIs for ramp-up discussed", "Gaps identified", "90-day targets set"] },
        ],
      },
    ],
  },
  {
    name: "Quarterly Business Review (QBR)",
    description: "End-to-end preparation and delivery of a quarterly sales review with leadership",
    category: "DEPARTMENT",
    estimatedDays: 14,
    tags: "QBR, quarterly review, sales performance, leadership",
    department: "Sales",
    groups: [
      {
        name: "Data Preparation",
        color: "#f59e0b",
        tasks: [
          { title: "Pull Q Revenue & Pipeline Report from CRM", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 12, checklist: ["Closed-won revenue vs target", "Pipeline value by stage", "Win/loss rate", "Avg deal size"] },
          { title: "Compile Individual Rep Performance Data", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 11, checklist: ["Quota attainment per rep", "Activity metrics (calls, emails, demos)", "Top performers highlighted"] },
          { title: "Identify Top 3 Wins & Top 3 Losses", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 10, checklist: ["Win reasons documented", "Loss reasons documented", "Patterns identified"] },
        ],
      },
      {
        name: "Presentation Build",
        color: "#6366f1",
        tasks: [
          { title: "Build QBR Slide Deck", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 4, dayOffset: 7, checklist: ["Executive summary slide", "Revenue vs target chart", "Pipeline health slide", "Next quarter forecast included"] },
          { title: "Next Quarter Goals & Forecast", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 5, checklist: ["Revenue target set", "Activity targets per rep", "Key deals to close listed"] },
          { title: "Internal Dry Run", assignedRole: "SALES_MANAGER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 3, checklist: ["Deck reviewed with team lead", "Timing under 45 min", "Q&A prep done"] },
        ],
      },
      {
        name: "QBR Delivery",
        color: "#10b981",
        tasks: [
          { title: "Present QBR to Leadership", assignedRole: "SALES_MANAGER", priority: "URGENT", estimatedHours: 1, dayOffset: 1, checklist: ["Deck shared ahead of time", "All attendees confirmed", "Recording set up"] },
          { title: "Capture Action Items & Distribute Notes", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0, checklist: ["Action items listed with owners", "Notes shared within 24 hrs", "Decisions documented"] },
        ],
      },
    ],
  },
  {
    name: "Monthly Pipeline Review",
    description: "Structured monthly health check of the sales pipeline — deals, forecast, and blockers",
    category: "DEPARTMENT",
    estimatedDays: 5,
    tags: "pipeline, monthly review, forecast, CRM",
    department: "Sales",
    groups: [
      {
        name: "Pipeline Hygiene",
        color: "#e8170b",
        tasks: [
          { title: "Audit CRM for Stale Deals (30+ Days No Activity)", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 1, dayOffset: 4, checklist: ["Deals with no activity flagged", "Stage accuracy confirmed", "Closed-lost updated for dead deals"] },
          { title: "Update Deal Stages & Close Dates", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 1, dayOffset: 4, checklist: ["All open deals reviewed", "Close dates realistic", "Next steps logged on each deal"] },
        ],
      },
      {
        name: "Forecast & Blockers",
        color: "#3b82f6",
        tasks: [
          { title: "Submit Individual Monthly Forecast", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 1, dayOffset: 3, checklist: ["Commit, best-case, and pipeline amounts submitted", "Top 3 deals to close listed", "Risks flagged"] },
          { title: "Identify Deals Needing Manager Support", assignedRole: "SALES_REP", priority: "MEDIUM", estimatedHours: 1, dayOffset: 3, checklist: ["Stalled deals escalated", "Executive sponsor needed?", "Procurement or legal blockers noted"] },
        ],
      },
      {
        name: "Team Review Meeting",
        color: "#10b981",
        tasks: [
          { title: "Run Monthly Pipeline Review Meeting", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 1, checklist: ["Each rep's top deals reviewed", "Blockers discussed", "Coaching opportunities noted"] },
          { title: "Share Forecast Summary with Leadership", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 0, checklist: ["Total pipeline value", "Likely-to-close this month", "Risks flagged"] },
        ],
      },
    ],
  },
  {
    name: "Sales Playbook Update",
    description: "Annual refresh of the sales playbook — ICP, messaging, objections, and sequences",
    category: "DEPARTMENT",
    estimatedDays: 21,
    tags: "playbook, sales process, ICP, enablement",
    department: "Sales",
    groups: [
      {
        name: "Audit & Research",
        color: "#8b5cf6",
        tasks: [
          { title: "Review Win/Loss Data from Past Year", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 3, dayOffset: 19, checklist: ["Top win reasons listed", "Top loss reasons listed", "Common objections catalogued"] },
          { title: "Survey Sales Reps for Playbook Gaps", assignedRole: "SALES_MANAGER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 17, checklist: ["Survey sent to all reps", "Responses collected", "Themes summarised"] },
          { title: "Competitive Landscape Update", assignedRole: "BUSINESS_DEVELOPMENT", priority: "HIGH", estimatedHours: 3, dayOffset: 15, checklist: ["Top 3 competitors reviewed", "Battle cards updated", "Differentiators refreshed"] },
        ],
      },
      {
        name: "Playbook Rewrite",
        color: "#f59e0b",
        tasks: [
          { title: "Update ICP & Buyer Personas", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 12, checklist: ["Firmographic criteria updated", "Pain points refreshed", "Stakeholder map updated"] },
          { title: "Refresh Email & Call Sequences", assignedRole: "SALES_REP", priority: "HIGH", estimatedHours: 4, dayOffset: 10, checklist: ["Cold outreach sequence updated", "Follow-up cadence set", "Voicemail scripts updated"] },
          { title: "Update Objection Handling Responses", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 8, checklist: ["Top 10 objections covered", "Responses signed off by team", "Added to CRM cheat sheet"] },
        ],
      },
      {
        name: "Review & Rollout",
        color: "#10b981",
        tasks: [
          { title: "Leadership Sign-Off on Updated Playbook", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 1, dayOffset: 4, checklist: ["Changes summarised for review", "Feedback incorporated", "Final version approved"] },
          { title: "Team Training Session on New Playbook", assignedRole: "SALES_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 2, checklist: ["All reps attended", "Key changes highlighted", "Q&A completed"] },
          { title: "Publish Playbook to Shared Drive", assignedRole: "SALES_MANAGER", priority: "MEDIUM", estimatedHours: 1, dayOffset: 0, checklist: ["Published in agreed location", "All reps notified", "Old version archived"] },
        ],
      },
    ],
  },

  // ── Tech / Dev ──────────────────────────────────────────────────────────────
  {
    name: "Feature Development Sprint",
    description: "Two-week agile sprint — from planning to production release",
    category: "CAMPAIGN",
    estimatedDays: 14,
    tags: "sprint, agile, development, engineering",
    department: "Tech/Dev",
    groups: [
      {
        name: "Planning",
        color: "#6366f1",
        tasks: [
          { title: "Sprint Planning & Backlog Grooming", priority: "HIGH", estimatedHours: 2, dayOffset: 13, checklist: ["User stories prioritised", "Story points estimated", "Sprint goal defined", "Team capacity confirmed"] },
          { title: "Technical Design / Architecture Review", priority: "HIGH", estimatedHours: 3, dayOffset: 12, checklist: ["API contracts defined", "DB schema changes noted", "Dependencies identified"] },
        ],
      },
      {
        name: "Development",
        color: "#3b82f6",
        tasks: [
          { title: "Backend Development", priority: "HIGH", estimatedHours: 20, dayOffset: 9, checklist: ["Unit tests written", "API endpoints tested", "Error handling in place"] },
          { title: "Frontend Development", priority: "HIGH", estimatedHours: 16, dayOffset: 7, checklist: ["UI matches design", "Responsive on mobile", "Loading states handled"] },
          { title: "Code Review (PR)", priority: "HIGH", estimatedHours: 4, dayOffset: 4, checklist: ["At least 1 reviewer approved", "No critical comments open"] },
        ],
      },
      {
        name: "Testing & Release",
        color: "#10b981",
        tasks: [
          { title: "QA Testing (Functional + Regression)", priority: "HIGH", estimatedHours: 6, dayOffset: 2, checklist: ["Test cases executed", "Bugs logged", "Critical bugs fixed"] },
          { title: "Staging Deployment & Smoke Test", priority: "HIGH", estimatedHours: 2, dayOffset: 1 },
          { title: "Production Release", priority: "URGENT", estimatedHours: 1, dayOffset: 0, checklist: ["Deployment successful", "Monitoring alerts configured", "Rollback plan ready"] },
        ],
      },
    ],
  },
  {
    name: "Website Redesign",
    description: "Full website redesign from discovery to production launch",
    category: "CAMPAIGN",
    estimatedDays: 30,
    tags: "website, redesign, UX, development",
    department: "Tech/Dev",
    groups: [
      {
        name: "Discovery & Planning",
        color: "#8b5cf6",
        tasks: [
          { title: "Stakeholder Requirements Gathering", priority: "HIGH", estimatedHours: 4, dayOffset: 28, checklist: ["Goals documented", "Target audience defined", "Competitor sites reviewed"] },
          { title: "Information Architecture (Sitemap)", priority: "HIGH", estimatedHours: 3, dayOffset: 25 },
          { title: "Wireframes — Key Pages", priority: "HIGH", estimatedHours: 6, dayOffset: 22 },
        ],
      },
      {
        name: "Design",
        color: "#ec4899",
        tasks: [
          { title: "UI Design — Desktop (Figma)", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 16, dayOffset: 18, checklist: ["Design system created", "Homepage done", "5+ inner pages done", "Dark mode variants"] },
          { title: "UI Design — Mobile", assignedRole: "GRAPHIC_DESIGNER", priority: "HIGH", estimatedHours: 8, dayOffset: 14 },
          { title: "Design Approval", assignedRole: "MARKETING_MANAGER", priority: "HIGH", estimatedHours: 2, dayOffset: 12 },
        ],
      },
      {
        name: "Development",
        color: "#3b82f6",
        tasks: [
          { title: "Dev Environment Setup & CMS Config", priority: "HIGH", estimatedHours: 4, dayOffset: 10 },
          { title: "Frontend Development", priority: "HIGH", estimatedHours: 24, dayOffset: 6, checklist: ["Pixel-perfect vs design", "Responsive on all breakpoints", "Page speed optimised"] },
          { title: "SEO Metadata & Analytics Setup", assignedRole: "SEO_SPECIALIST", priority: "HIGH", estimatedHours: 3, dayOffset: 3 },
        ],
      },
      {
        name: "Testing & Launch",
        color: "#10b981",
        tasks: [
          { title: "Cross-Browser & Device QA", priority: "HIGH", estimatedHours: 4, dayOffset: 2, checklist: ["Chrome, Firefox, Safari, Edge", "iOS & Android tested", "Forms working", "404 page configured"] },
          { title: "Go-Live & DNS Cutover", priority: "URGENT", estimatedHours: 2, dayOffset: 0, checklist: ["SSL active", "Redirects in place", "GA4 tracking live", "Sitemap submitted to Google"] },
        ],
      },
    ],
  },
  {
    name: "Bug Fix & QA Sprint",
    description: "Focused sprint to triage, fix, and verify reported bugs",
    category: "TASK",
    estimatedDays: 7,
    tags: "bugs, QA, hotfix, testing",
    department: "Tech/Dev",
    groups: [
      {
        name: "Triage",
        color: "#e8170b",
        tasks: [
          { title: "Bug Backlog Review & Prioritisation", priority: "HIGH", estimatedHours: 2, dayOffset: 6, checklist: ["Severity tagged (P1–P4)", "Duplicates removed", "Owner assigned to each"] },
          { title: "Reproduce & Document P1/P2 Bugs", priority: "URGENT", estimatedHours: 2, dayOffset: 5 },
        ],
      },
      {
        name: "Fix",
        color: "#6366f1",
        tasks: [
          { title: "Fix P1 Critical Bugs", priority: "URGENT", estimatedHours: 8, dayOffset: 4 },
          { title: "Fix P2 High-Priority Bugs", priority: "HIGH", estimatedHours: 8, dayOffset: 3 },
          { title: "Fix P3/P4 Bugs", priority: "MEDIUM", estimatedHours: 6, dayOffset: 2 },
        ],
      },
      {
        name: "QA & Deploy",
        color: "#10b981",
        tasks: [
          { title: "Regression Testing", priority: "HIGH", estimatedHours: 4, dayOffset: 1, checklist: ["All reported bugs verified fixed", "No new regressions found"] },
          { title: "Hotfix Deployment", priority: "URGENT", estimatedHours: 1, dayOffset: 0, checklist: ["Deployed to production", "Monitoring checked", "Stakeholders notified"] },
        ],
      },
    ],
  },

  // ── Tech / Dev (additional 7) ─────────────────────────────────────────────
  {
    name: "API Integration",
    description: "End-to-end workflow to design, build, test, and document a third-party API integration",
    category: "TASK",
    estimatedDays: 14,
    tags: "API, integration, backend, REST",
    department: "Tech/Dev",
    groups: [
      {
        name: "Discovery & Design",
        color: "#6366f1",
        tasks: [
          { title: "API Documentation Review", priority: "HIGH", estimatedHours: 3, dayOffset: 13, checklist: ["Auth method understood (OAuth/API Key)", "Rate limits noted", "Webhook support checked", "Sandbox credentials obtained"] },
          { title: "Integration Design & Data Mapping", priority: "HIGH", estimatedHours: 3, dayOffset: 11, checklist: ["Request/response schemas mapped", "Error handling strategy defined", "Retry logic planned"] },
        ],
      },
      {
        name: "Development",
        color: "#3b82f6",
        tasks: [
          { title: "Build Integration (Dev Environment)", priority: "HIGH", estimatedHours: 12, dayOffset: 8, checklist: ["Auth flow implemented", "All endpoints integrated", "Error handling implemented", "Logging added"] },
          { title: "Unit & Integration Tests", priority: "HIGH", estimatedHours: 4, dayOffset: 4, checklist: ["Happy path tests pass", "Error/edge case tests pass", "Mock API used where needed"] },
          { title: "Code Review", priority: "HIGH", estimatedHours: 2, dayOffset: 2 },
        ],
      },
      {
        name: "Release & Docs",
        color: "#10b981",
        tasks: [
          { title: "Deploy to Staging & UAT", priority: "HIGH", estimatedHours: 2, dayOffset: 1 },
          { title: "Write Technical Documentation", priority: "HIGH", estimatedHours: 2, dayOffset: 0, checklist: ["Setup instructions", "Environment variables listed", "Error codes documented"] },
          { title: "Production Deployment", priority: "URGENT", estimatedHours: 1 },
        ],
      },
    ],
  },
  {
    name: "Mobile App Release",
    description: "End-to-end process for releasing a new version of a mobile app to App Store & Google Play",
    category: "CAMPAIGN",
    estimatedDays: 14,
    tags: "mobile, iOS, Android, release, app store",
    department: "Tech/Dev",
    groups: [
      {
        name: "Pre-Release",
        color: "#8b5cf6",
        tasks: [
          { title: "Feature Freeze & Release Branch Cut", priority: "URGENT", estimatedHours: 1, dayOffset: 13, checklist: ["Release branch created", "No new features merged after freeze", "Version bumped"] },
          { title: "QA — Full Regression (iOS + Android)", priority: "HIGH", estimatedHours: 8, dayOffset: 10, checklist: ["Functional test cases executed", "Performance tested", "Crash-free rate >99.5%", "No P1 bugs open"] },
          { title: "Beta Build to TestFlight / Firebase", priority: "HIGH", estimatedHours: 2, dayOffset: 8 },
        ],
      },
      {
        name: "Store Submission",
        color: "#e8170b",
        tasks: [
          { title: "Update App Store Listing (Screenshots, Copy)", priority: "MEDIUM", estimatedHours: 2, dayOffset: 6, checklist: ["New screenshots uploaded", "What's new section written", "Keywords updated"] },
          { title: "Submit to App Store & Google Play", priority: "URGENT", estimatedHours: 1, dayOffset: 5, checklist: ["iOS build uploaded", "Android bundle uploaded", "Review notes added"] },
        ],
      },
      {
        name: "Go-Live & Monitor",
        color: "#10b981",
        tasks: [
          { title: "Release Approved & Go Live", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0 },
          { title: "Monitor Crash Reports & Reviews (48h)", priority: "HIGH", estimatedHours: 2, checklist: ["Crash rate stable", "App store rating checked", "Critical reviews responded to"] },
        ],
      },
    ],
  },
  {
    name: "Database Migration",
    description: "Plan and execute a safe database migration or schema change in production",
    category: "TASK",
    estimatedDays: 10,
    tags: "database, migration, schema, SQL, PostgreSQL",
    department: "Tech/Dev",
    groups: [
      {
        name: "Planning",
        color: "#f59e0b",
        tasks: [
          { title: "Migration Scope & Risk Assessment", priority: "HIGH", estimatedHours: 2, dayOffset: 9, checklist: ["Tables affected listed", "Data volume estimated", "Downtime window required?", "Rollback plan defined"] },
          { title: "Write & Review Migration Scripts", priority: "HIGH", estimatedHours: 4, dayOffset: 7, checklist: ["UP script written", "DOWN (rollback) script written", "Peer reviewed"] },
        ],
      },
      {
        name: "Testing",
        color: "#6366f1",
        tasks: [
          { title: "Run Migration on Staging DB", priority: "HIGH", estimatedHours: 2, dayOffset: 5, checklist: ["No data loss", "Indexes rebuilt correctly", "Application still functional post-migration"] },
          { title: "Performance Testing Post-Migration", priority: "HIGH", estimatedHours: 2, dayOffset: 3, checklist: ["Query performance benchmarked", "Slow queries identified"] },
        ],
      },
      {
        name: "Production",
        color: "#10b981",
        tasks: [
          { title: "Schedule Maintenance Window", priority: "HIGH", estimatedHours: 0.5, dayOffset: 2, checklist: ["Stakeholders notified", "Maintenance page ready"] },
          { title: "Run Production Migration", priority: "URGENT", estimatedHours: 2, dayOffset: 0, checklist: ["Backup taken before start", "Migration completed", "Data verified", "Rollback not needed"] },
          { title: "Post-Migration Monitoring (24h)", priority: "HIGH", estimatedHours: 1 },
        ],
      },
    ],
  },
  {
    name: "Security Audit",
    description: "Internal security review and hardening of application, infrastructure, and access controls",
    category: "TASK",
    estimatedDays: 14,
    tags: "security, audit, OWASP, penetration testing, compliance",
    department: "Tech/Dev",
    groups: [
      {
        name: "Recon & Scanning",
        color: "#e8170b",
        tasks: [
          { title: "OWASP Top 10 Vulnerability Scan", priority: "URGENT", estimatedHours: 4, dayOffset: 13, checklist: ["SQL injection checked", "XSS checked", "Auth/session issues checked", "Sensitive data exposure checked"] },
          { title: "Dependency & CVE Audit", priority: "HIGH", estimatedHours: 2, dayOffset: 11, checklist: ["npm audit / pip audit run", "Critical CVEs listed", "Update plan created"] },
          { title: "Infrastructure & IAM Review", priority: "HIGH", estimatedHours: 3, dayOffset: 9, checklist: ["Least-privilege access confirmed", "Unused credentials revoked", "MFA enforced for all admins"] },
        ],
      },
      {
        name: "Remediation",
        color: "#6366f1",
        tasks: [
          { title: "Fix Critical & High Severity Issues", priority: "URGENT", estimatedHours: 8, dayOffset: 6, checklist: ["All P1 findings fixed", "All P2 findings fixed or mitigated"] },
          { title: "Patch Outdated Dependencies", priority: "HIGH", estimatedHours: 4, dayOffset: 3 },
        ],
      },
      {
        name: "Report & Hardening",
        color: "#10b981",
        tasks: [
          { title: "Security Audit Report", priority: "HIGH", estimatedHours: 3, dayOffset: 1, checklist: ["All findings documented", "Severity ratings applied", "Fix status per finding"] },
          { title: "Security Hardening Checklist Sign-off", priority: "HIGH", estimatedHours: 1, dayOffset: 0 },
        ],
      },
    ],
  },
  {
    name: "CI/CD Pipeline Setup",
    description: "Design and implement a full CI/CD pipeline for automated testing and deployment",
    category: "TASK",
    estimatedDays: 10,
    tags: "CI/CD, DevOps, automation, GitHub Actions, deployment",
    department: "Tech/Dev",
    groups: [
      {
        name: "Design",
        color: "#3b82f6",
        tasks: [
          { title: "Pipeline Architecture Design", priority: "HIGH", estimatedHours: 3, dayOffset: 9, checklist: ["Stages defined: lint → test → build → deploy", "Environments: dev, staging, prod", "Branch strategy documented", "Secrets management approach"] },
          { title: "Tool Selection & Access Setup", priority: "HIGH", estimatedHours: 1, dayOffset: 8, checklist: ["CI platform chosen (GitHub Actions / GitLab CI)", "Cloud credentials configured", "Container registry access"] },
        ],
      },
      {
        name: "Implementation",
        color: "#6366f1",
        tasks: [
          { title: "Build Lint & Test Stage", priority: "HIGH", estimatedHours: 3, dayOffset: 6, checklist: ["Unit tests run on every PR", "Coverage threshold enforced", "Code quality gate"] },
          { title: "Build & Containerise Stage", priority: "HIGH", estimatedHours: 3, dayOffset: 4, checklist: ["Docker image built", "Image tagged with commit SHA", "Pushed to registry"] },
          { title: "Deploy to Staging Automatically", priority: "HIGH", estimatedHours: 2, dayOffset: 2, checklist: ["Staging deploy on merge to main", "Smoke test after deploy", "Slack notification on success/fail"] },
        ],
      },
      {
        name: "Production Gate",
        color: "#10b981",
        tasks: [
          { title: "Manual Approval Gate for Production", priority: "HIGH", estimatedHours: 1, dayOffset: 1 },
          { title: "End-to-End Pipeline Test", priority: "URGENT", estimatedHours: 2, dayOffset: 0, checklist: ["Full pipeline run verified", "Rollback mechanism tested", "Pipeline docs written"] },
        ],
      },
    ],
  },
  {
    name: "Technical Documentation Sprint",
    description: "Systematic effort to document codebase, APIs, architecture, and runbooks",
    category: "TASK",
    estimatedDays: 7,
    tags: "documentation, runbook, API docs, architecture, wiki",
    department: "Tech/Dev",
    groups: [
      {
        name: "Audit & Plan",
        color: "#8b5cf6",
        tasks: [
          { title: "Documentation Gap Audit", priority: "HIGH", estimatedHours: 2, dayOffset: 6, checklist: ["List undocumented APIs", "List undocumented services", "Outdated docs flagged"] },
          { title: "Assign Owners to Each Section", priority: "HIGH", estimatedHours: 0.5, dayOffset: 5 },
        ],
      },
      {
        name: "Write",
        color: "#3b82f6",
        tasks: [
          { title: "API Reference Documentation", priority: "HIGH", estimatedHours: 5, dayOffset: 4, checklist: ["All endpoints documented", "Request/response examples", "Auth method explained"] },
          { title: "Architecture Diagram & Overview", priority: "HIGH", estimatedHours: 3, dayOffset: 3, checklist: ["System components diagram", "Data flow diagram", "Infrastructure overview"] },
          { title: "Runbooks — Incident Response & Deployments", priority: "HIGH", estimatedHours: 3, dayOffset: 2, checklist: ["Deployment runbook", "Incident triage runbook", "On-call escalation path"] },
        ],
      },
      {
        name: "Review & Publish",
        color: "#10b981",
        tasks: [
          { title: "Peer Review All Docs", priority: "HIGH", estimatedHours: 2, dayOffset: 1 },
          { title: "Publish to Wiki / Confluence / Notion", priority: "HIGH", estimatedHours: 1, dayOffset: 0, checklist: ["All docs published", "Links from README updated", "Team notified"] },
        ],
      },
    ],
  },
  {
    name: "Code Refactoring Sprint",
    description: "Focused sprint to reduce technical debt — refactor legacy modules, improve test coverage",
    category: "TASK",
    estimatedDays: 10,
    tags: "refactoring, tech debt, clean code, testing",
    department: "Tech/Dev",
    groups: [
      {
        name: "Scoping",
        color: "#f59e0b",
        tasks: [
          { title: "Tech Debt Backlog Review & Prioritisation", priority: "HIGH", estimatedHours: 2, dayOffset: 9, checklist: ["Modules sorted by complexity & risk", "Quick wins identified", "Sprint scope agreed"] },
          { title: "Establish Test Coverage Baseline", priority: "HIGH", estimatedHours: 1, dayOffset: 8, checklist: ["Current coverage % recorded", "Target coverage % set"] },
        ],
      },
      {
        name: "Refactoring",
        color: "#6366f1",
        tasks: [
          { title: "Refactor Module 1 (High Priority)", priority: "HIGH", estimatedHours: 8, dayOffset: 6, checklist: ["No behaviour changes", "Tests pass", "PR reviewed & merged"] },
          { title: "Refactor Module 2", priority: "HIGH", estimatedHours: 8, dayOffset: 4 },
          { title: "Improve Unit Test Coverage to Target", priority: "HIGH", estimatedHours: 5, dayOffset: 2 },
        ],
      },
      {
        name: "Validate & Close",
        color: "#10b981",
        tasks: [
          { title: "Regression Testing After Refactors", priority: "HIGH", estimatedHours: 3, dayOffset: 1, checklist: ["All existing tests still pass", "No new bugs introduced"] },
          { title: "Tech Debt Reduction Report", priority: "MEDIUM", estimatedHours: 1, dayOffset: 0, checklist: ["Modules refactored listed", "Coverage improvement noted", "Next candidates identified"] },
        ],
      },
    ],
  },

  // ── HR ──────────────────────────────────────────────────────────────────────
  {
    name: "Employee Onboarding",
    description: "End-to-end new hire onboarding — from offer acceptance to 30-day check-in",
    category: "CAMPAIGN",
    estimatedDays: 30,
    tags: "onboarding, HR, new hire, induction",
    department: "HR",
    groups: [
      {
        name: "Pre-Arrival",
        color: "#6366f1",
        tasks: [
          { title: "Send Offer Letter & Contracts", priority: "URGENT", estimatedHours: 1, dayOffset: 28, checklist: ["Offer letter signed", "NDA signed", "Bank details collected"] },
          { title: "IT Equipment & Access Setup", priority: "HIGH", estimatedHours: 2, dayOffset: 21, checklist: ["Laptop provisioned", "Email account created", "Software licenses assigned", "Slack / comms added"] },
          { title: "Onboarding Schedule Prepared", priority: "HIGH", estimatedHours: 1, dayOffset: 14, checklist: ["Week 1 calendar blocked", "Buddy assigned", "Team intro meeting scheduled"] },
          { title: "Welcome Email Sent", priority: "MEDIUM", estimatedHours: 0.5, dayOffset: 7, checklist: ["First day instructions", "Parking / office info", "Dress code", "Team contacts"] },
        ],
      },
      {
        name: "Day 1 & Week 1",
        color: "#e8170b",
        tasks: [
          { title: "Day 1 — Welcome & Office Tour", priority: "HIGH", estimatedHours: 2, dayOffset: 0, checklist: ["Meet the team", "Desk / workspace set up", "ID badge / access card issued"] },
          { title: "HR Admin — Payroll & Benefits Setup", priority: "HIGH", estimatedHours: 1, dayOffset: 0 },
          { title: "Role Overview & 90-Day Goals Set", priority: "HIGH", estimatedHours: 2 },
          { title: "System & Tool Walkthroughs", priority: "MEDIUM", estimatedHours: 3 },
        ],
      },
      {
        name: "30-Day Check-in",
        color: "#10b981",
        tasks: [
          { title: "30-Day 1:1 with Manager", priority: "HIGH", estimatedHours: 1, checklist: ["Settling-in feedback captured", "Any blockers flagged", "Role clarity confirmed"] },
          { title: "Collect Onboarding Feedback", priority: "MEDIUM", estimatedHours: 0.5 },
        ],
      },
    ],
  },
  {
    name: "Recruitment Pipeline",
    description: "Full hiring cycle from job posting to offer acceptance",
    category: "CAMPAIGN",
    estimatedDays: 21,
    tags: "recruitment, hiring, interview, talent acquisition",
    department: "HR",
    groups: [
      {
        name: "Job Posting & Sourcing",
        color: "#8b5cf6",
        tasks: [
          { title: "Write Job Description", priority: "HIGH", estimatedHours: 2, dayOffset: 20, checklist: ["Role title & seniority clear", "Responsibilities listed", "Must-have vs nice-to-have skills", "Salary range included"] },
          { title: "Post on Job Boards & LinkedIn", priority: "HIGH", estimatedHours: 1, dayOffset: 19, checklist: ["LinkedIn Jobs", "Indeed", "Company website careers page"] },
          { title: "Proactive Sourcing (LinkedIn Recruiter)", priority: "MEDIUM", estimatedHours: 4, dayOffset: 17 },
        ],
      },
      {
        name: "Screening & Interviews",
        color: "#f59e0b",
        tasks: [
          { title: "CV Screening & Shortlisting", priority: "HIGH", estimatedHours: 3, dayOffset: 14, checklist: ["Top 10–15 CVs shortlisted", "Rejection emails sent to others"] },
          { title: "Phone / Video Screening (15 min)", priority: "HIGH", estimatedHours: 3, dayOffset: 11 },
          { title: "First Round Interview", priority: "HIGH", estimatedHours: 4, dayOffset: 8, checklist: ["Scorecard completed per candidate", "Interview panel briefed"] },
          { title: "Final Round / Technical Assessment", priority: "HIGH", estimatedHours: 3, dayOffset: 4 },
        ],
      },
      {
        name: "Offer & Close",
        color: "#10b981",
        tasks: [
          { title: "Reference Checks", priority: "HIGH", estimatedHours: 1, dayOffset: 2 },
          { title: "Offer Preparation & Approval", priority: "URGENT", estimatedHours: 1, dayOffset: 1, checklist: ["Salary benchmarked", "Benefits confirmed", "Start date agreed"] },
          { title: "Offer Extended & Accepted", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0 },
        ],
      },
    ],
  },
  {
    name: "Performance Review Cycle",
    description: "Structured performance review process — self-assessment to final feedback",
    category: "TASK",
    estimatedDays: 14,
    tags: "performance, review, appraisal, feedback",
    department: "HR",
    groups: [
      {
        name: "Preparation",
        color: "#6366f1",
        tasks: [
          { title: "Send Review Instructions & Forms to Team", priority: "HIGH", estimatedHours: 1, dayOffset: 13, checklist: ["Self-assessment form sent", "Peer feedback requests sent", "Deadline communicated"] },
          { title: "Self-Assessments Completed", priority: "HIGH", estimatedHours: 1, dayOffset: 10 },
          { title: "Manager Assessments Completed", priority: "HIGH", estimatedHours: 2, dayOffset: 7, checklist: ["Rating per competency", "Achievements noted", "Development areas noted"] },
        ],
      },
      {
        name: "Review Meetings",
        color: "#e8170b",
        tasks: [
          { title: "1:1 Review Meetings with Each Team Member", priority: "HIGH", estimatedHours: 6, dayOffset: 4, checklist: ["Feedback delivered", "Goals for next cycle agreed", "Any salary/promotion discussion noted"] },
          { title: "Calibration Session with Leadership", priority: "HIGH", estimatedHours: 2, dayOffset: 2 },
        ],
      },
      {
        name: "Outcomes",
        color: "#10b981",
        tasks: [
          { title: "Log Outcomes in HR System", priority: "HIGH", estimatedHours: 1, dayOffset: 1 },
          { title: "Send Salary / Promotion Letters (if applicable)", priority: "HIGH", estimatedHours: 1, dayOffset: 0 },
          { title: "Aggregate Review Insights Report", priority: "MEDIUM", estimatedHours: 2, checklist: ["Team strengths", "Common development needs", "Retention risk flags"] },
        ],
      },
    ],
  },

  // ── HR (additional 7) ──────────────────────────────────────────────────────
  {
    name: "Employee Offboarding",
    description: "Structured checklist to smoothly offboard a departing employee",
    category: "TASK",
    estimatedDays: 10,
    tags: "offboarding, exit, HR, departure",
    department: "HR",
    groups: [
      {
        name: "Notice Period",
        color: "#6366f1",
        tasks: [
          { title: "Resignation / Termination Acknowledged", priority: "URGENT", estimatedHours: 0.5, dayOffset: 9, checklist: ["HR notified", "Manager notified", "Exit date confirmed"] },
          { title: "Knowledge Transfer Plan Created", priority: "HIGH", estimatedHours: 2, dayOffset: 8, checklist: ["Key responsibilities documented", "Handover buddy assigned", "Transition schedule agreed"] },
          { title: "Announce Departure to Team (if appropriate)", priority: "MEDIUM", estimatedHours: 0.5, dayOffset: 7 },
        ],
      },
      {
        name: "Final Week",
        color: "#e8170b",
        tasks: [
          { title: "Knowledge Transfer Meetings / Docs Complete", priority: "HIGH", estimatedHours: 4, dayOffset: 4, checklist: ["All processes handed over", "Open tasks reassigned", "Passwords / credentials transferred securely"] },
          { title: "Exit Interview", priority: "HIGH", estimatedHours: 1, dayOffset: 2, checklist: ["Exit survey completed", "Key feedback noted", "Anonymised for insights"] },
          { title: "Payroll Final Payment Calculated", priority: "HIGH", estimatedHours: 1, dayOffset: 1, checklist: ["Unused leave paid out", "Final salary processed", "P45 / documentation prepared"] },
        ],
      },
      {
        name: "Last Day",
        color: "#10b981",
        tasks: [
          { title: "IT Access Revoked", priority: "URGENT", estimatedHours: 0.5, dayOffset: 0, checklist: ["Email disabled", "Systems access removed", "Slack/comms removed", "VPN access revoked"] },
          { title: "Company Assets Returned", priority: "HIGH", estimatedHours: 0.5, dayOffset: 0, checklist: ["Laptop returned", "Access card returned", "Phone / peripherals returned"] },
        ],
      },
    ],
  },
  {
    name: "Training & Development Programme",
    description: "Plan and run a structured learning and development programme for the team",
    category: "CAMPAIGN",
    estimatedDays: 21,
    tags: "training, L&D, learning, skills, development",
    department: "HR",
    groups: [
      {
        name: "Needs Assessment",
        color: "#8b5cf6",
        tasks: [
          { title: "Skills Gap Analysis", priority: "HIGH", estimatedHours: 3, dayOffset: 20, checklist: ["Survey sent to all team members", "Manager input collected", "Top skill gaps ranked"] },
          { title: "Define Learning Objectives", priority: "HIGH", estimatedHours: 2, dayOffset: 17, checklist: ["Business-aligned objectives", "Measurable outcomes defined", "Budget approved"] },
        ],
      },
      {
        name: "Programme Design",
        color: "#3b82f6",
        tasks: [
          { title: "Source Training Content / Vendor", priority: "HIGH", estimatedHours: 4, dayOffset: 14, checklist: ["Internal vs external training", "Vendor shortlisted", "Course materials reviewed"] },
          { title: "Schedule Training Sessions", priority: "HIGH", estimatedHours: 1, dayOffset: 10, checklist: ["Sessions in calendar", "Attendance confirmed", "Pre-work sent to attendees"] },
        ],
      },
      {
        name: "Delivery & Evaluation",
        color: "#10b981",
        tasks: [
          { title: "Run Training Sessions", priority: "HIGH", estimatedHours: 8, dayOffset: 7, checklist: ["Attendance tracked", "Recording saved", "Q&A captured"] },
          { title: "Post-Training Assessment", priority: "HIGH", estimatedHours: 2, dayOffset: 2, checklist: ["Knowledge check completed", "Scores recorded", "Certificates issued if applicable"] },
          { title: "Training Effectiveness Report", priority: "MEDIUM", estimatedHours: 2, dayOffset: 0, checklist: ["Pre vs post skills comparison", "Feedback scores", "Recommendations for next programme"] },
        ],
      },
    ],
  },
  {
    name: "Employee Engagement Survey",
    description: "Design, run, and act on an all-hands employee engagement survey",
    category: "TASK",
    estimatedDays: 21,
    tags: "engagement, survey, eNPS, culture, feedback",
    department: "HR",
    groups: [
      {
        name: "Survey Design",
        color: "#6366f1",
        tasks: [
          { title: "Define Survey Goals & Questions", priority: "HIGH", estimatedHours: 3, dayOffset: 20, checklist: ["eNPS question included", "Work environment questions", "Management & growth questions", "Max 20 questions", "Anonymous confirmed"] },
          { title: "Build Survey in Platform", priority: "HIGH", estimatedHours: 2, dayOffset: 17, checklist: ["Survey tool set up", "Anonymous submission confirmed", "Test submission done"] },
        ],
      },
      {
        name: "Launch & Collect",
        color: "#f59e0b",
        tasks: [
          { title: "Launch Communication to All Staff", priority: "HIGH", estimatedHours: 1, dayOffset: 14, checklist: ["Purpose explained", "Anonymity confirmed", "Deadline stated"] },
          { title: "Mid-Survey Reminder", priority: "MEDIUM", estimatedHours: 0.5, dayOffset: 7 },
          { title: "Survey Close & Data Export", priority: "HIGH", estimatedHours: 0.5, dayOffset: 0 },
        ],
      },
      {
        name: "Analysis & Action",
        color: "#10b981",
        tasks: [
          { title: "Analyse Results & Identify Key Themes", priority: "HIGH", estimatedHours: 4, checklist: ["Scores by team/department", "eNPS score calculated", "Top 3 strengths", "Top 3 areas to improve"] },
          { title: "Present Results to Leadership", priority: "HIGH", estimatedHours: 2, checklist: ["Honest summary of results", "Benchmarks vs industry if available"] },
          { title: "Action Plan Published to All Staff", priority: "HIGH", estimatedHours: 2, checklist: ["Commitments specific and time-bound", "Owner per action", "Follow-up date set"] },
        ],
      },
    ],
  },
  {
    name: "HR Policy Update",
    description: "Review, update, and re-communicate a company HR policy (e.g. leave, remote work, conduct)",
    category: "TASK",
    estimatedDays: 10,
    tags: "policy, compliance, HR, documentation, handbook",
    department: "HR",
    groups: [
      {
        name: "Review",
        color: "#8b5cf6",
        tasks: [
          { title: "Audit Existing Policy vs Legal Requirements", priority: "HIGH", estimatedHours: 2, dayOffset: 9, checklist: ["Checked against current employment law", "Compared to industry norms", "Gaps or outdated sections flagged"] },
          { title: "Gather Stakeholder Input (Legal, Finance, Managers)", priority: "HIGH", estimatedHours: 2, dayOffset: 7 },
        ],
      },
      {
        name: "Drafting & Approval",
        color: "#6366f1",
        tasks: [
          { title: "Draft Updated Policy", priority: "HIGH", estimatedHours: 3, dayOffset: 5, checklist: ["Clear language, no jargon", "Effective date stated", "Change log included"] },
          { title: "Legal / Leadership Sign-off", priority: "URGENT", estimatedHours: 1, dayOffset: 3 },
        ],
      },
      {
        name: "Communication & Sign-off",
        color: "#10b981",
        tasks: [
          { title: "Update Employee Handbook / HRIS", priority: "HIGH", estimatedHours: 1, dayOffset: 2 },
          { title: "All-Staff Communication with Summary of Changes", priority: "HIGH", estimatedHours: 1, dayOffset: 1, checklist: ["What changed highlighted", "Effective date clear", "Questions contact provided"] },
          { title: "Collect Employee Acknowledgements", priority: "HIGH", estimatedHours: 1, dayOffset: 0, checklist: ["Digital sign-off collected from all staff", "Completion tracked"] },
        ],
      },
    ],
  },
  {
    name: "Team Building Event",
    description: "Plan and run an in-person or virtual team building activity to boost morale and cohesion",
    category: "TASK",
    estimatedDays: 14,
    tags: "team building, culture, morale, event, engagement",
    department: "HR",
    groups: [
      {
        name: "Planning",
        color: "#ec4899",
        tasks: [
          { title: "Define Event Format & Budget", priority: "HIGH", estimatedHours: 1, dayOffset: 13, checklist: ["In-person vs virtual", "Budget approved", "Headcount confirmed", "Date / time agreed"] },
          { title: "Choose Activity & Vendor", priority: "HIGH", estimatedHours: 2, dayOffset: 11, checklist: ["Options researched", "Inclusive activity chosen", "Booking confirmed"] },
        ],
      },
      {
        name: "Logistics",
        color: "#f59e0b",
        tasks: [
          { title: "Send Invites & Collect RSVPs", priority: "HIGH", estimatedHours: 0.5, dayOffset: 9 },
          { title: "Book Venue / Platform & Catering (if applicable)", priority: "HIGH", estimatedHours: 1, dayOffset: 7 },
          { title: "Send Joining Instructions to Attendees", priority: "MEDIUM", estimatedHours: 0.5, dayOffset: 2 },
        ],
      },
      {
        name: "Event & Follow-up",
        color: "#10b981",
        tasks: [
          { title: "Run Team Building Event", priority: "URGENT", estimatedHours: 4, dayOffset: 0, checklist: ["All attendees present", "Photos taken", "Activity completed"] },
          { title: "Collect Post-Event Feedback", priority: "MEDIUM", estimatedHours: 0.5, checklist: ["Short survey sent", "Ratings collected", "Ideas for next event noted"] },
        ],
      },
    ],
  },
  {
    name: "Payroll & Benefits Review",
    description: "Annual review and update of employee payroll, benefits, and compensation bands",
    category: "TASK",
    estimatedDays: 14,
    tags: "payroll, compensation, benefits, salary review, annual",
    department: "HR",
    groups: [
      {
        name: "Data Collection",
        color: "#3b82f6",
        tasks: [
          { title: "Pull Current Compensation Data by Role", priority: "HIGH", estimatedHours: 2, dayOffset: 13, checklist: ["All salaries listed by role & level", "Benefits per employee confirmed", "Last review date noted"] },
          { title: "Benchmark Against Market Data", priority: "HIGH", estimatedHours: 3, dayOffset: 10, checklist: ["Salary survey data sourced", "Comparison per role done", "Gaps highlighted"] },
        ],
      },
      {
        name: "Review & Decision",
        color: "#8b5cf6",
        tasks: [
          { title: "Manager Recommendations Collected", priority: "HIGH", estimatedHours: 2, dayOffset: 7, checklist: ["Performance ratings linked", "Retention risk noted", "Promotion recommendations flagged"] },
          { title: "Leadership Sign-off on Salary Adjustments", priority: "URGENT", estimatedHours: 2, dayOffset: 5, checklist: ["Budget envelope approved", "Individual adjustments approved", "Effective date confirmed"] },
          { title: "Benefits Package Review & Updates", priority: "HIGH", estimatedHours: 2, dayOffset: 3, checklist: ["Health insurance reviewed", "Any new benefits added", "Vendor contracts renewed"] },
        ],
      },
      {
        name: "Communication",
        color: "#10b981",
        tasks: [
          { title: "Individual Salary Letters Issued", priority: "HIGH", estimatedHours: 2, dayOffset: 1, checklist: ["New salary stated", "Effective date stated", "Manager delivers conversation first"] },
          { title: "Payroll Updated in System", priority: "URGENT", estimatedHours: 1, dayOffset: 0, checklist: ["Payroll platform updated", "Finance team notified", "Next payroll run verified"] },
        ],
      },
    ],
  },
  {
    name: "Diversity & Inclusion Initiative",
    description: "Plan and execute a structured D&I programme — from audit to training to policy change",
    category: "CAMPAIGN",
    estimatedDays: 30,
    tags: "DEI, diversity, inclusion, culture, belonging",
    department: "HR",
    groups: [
      {
        name: "Assessment",
        color: "#6366f1",
        tasks: [
          { title: "D&I Audit — Workforce Composition & Pay Gap", priority: "HIGH", estimatedHours: 4, dayOffset: 28, checklist: ["Gender split by level", "Ethnicity data (where legally permitted)", "Pay gap analysis", "Promotion rates by demographic"] },
          { title: "Employee D&I Sentiment Survey", priority: "HIGH", estimatedHours: 2, dayOffset: 24, checklist: ["Belonging score", "Psychological safety questions", "Inclusion in decision-making"] },
        ],
      },
      {
        name: "Programme Design",
        color: "#8b5cf6",
        tasks: [
          { title: "Set D&I Goals & KPIs", priority: "HIGH", estimatedHours: 2, dayOffset: 20, checklist: ["Representation targets", "Pay gap reduction target", "Training completion target"] },
          { title: "Inclusive Hiring Practices Review", priority: "HIGH", estimatedHours: 3, dayOffset: 16, checklist: ["Job descriptions bias-checked", "Diverse interview panels", "Structured scoring used"] },
          { title: "Source D&I Training Content", priority: "HIGH", estimatedHours: 3, dayOffset: 12, checklist: ["Unconscious bias training", "Inclusive leadership training", "Allyship resources"] },
        ],
      },
      {
        name: "Implementation & Reporting",
        color: "#10b981",
        tasks: [
          { title: "Run D&I Training for All Staff", priority: "HIGH", estimatedHours: 6, dayOffset: 7, checklist: ["All staff complete training", "Completion tracked", "Manager training separate session"] },
          { title: "Publish D&I Policy & Commitment Statement", priority: "HIGH", estimatedHours: 2, dayOffset: 3, checklist: ["Approved by leadership", "Published on website & handbook"] },
          { title: "Quarterly D&I Progress Report", priority: "HIGH", estimatedHours: 2, dayOffset: 0, checklist: ["KPIs vs targets", "Initiatives delivered", "Next quarter focus areas"] },
        ],
      },
    ],
  },
];

// ─── Departments to create ───────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: "Marketing", color: "#e8170b" },
  { name: "Sales",     color: "#3b82f6" },
  { name: "Tech/Dev",  color: "#10b981" },
  { name: "HR",        color: "#8b5cf6" },
];

// ─── Seed runner ─────────────────────────────────────────────────────────────

async function main() {
  let systemUser = await db.user.findFirst({ where: { email: "system@arthurlawrence.net" } });
  if (!systemUser) systemUser = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!systemUser) {
    console.error("No admin user found. Run the main seed first.");
    process.exit(1);
  }
  console.log(`Seeding with creator: ${systemUser.name}`);

  // 1. Upsert departments
  console.log("\n📂 Upserting departments…");
  const deptMap: Record<string, string> = {};
  for (const d of DEPARTMENTS) {
    const existing = await db.department.findFirst({ where: { name: d.name } });
    if (existing) {
      deptMap[d.name] = existing.id;
      console.log(`  ↩ ${d.name} (already exists)`);
    } else {
      const created = await db.department.create({ data: d });
      deptMap[d.name] = created.id;
      console.log(`  ✓ ${d.name}`);
    }
  }

  // 2. Delete existing built-in templates
  await db.taskTemplate.deleteMany({ where: { isBuiltIn: true } });
  console.log("\n🗑  Cleared old built-in templates");

  // 3. Helper to create a template
  async function createTemplate(tmpl: TemplateDef, departmentId: string | null) {
    await db.taskTemplate.create({
      data: {
        name: tmpl.name,
        description: tmpl.description,
        category: tmpl.category,
        estimatedDays: tmpl.estimatedDays,
        tags: tmpl.tags,
        isBuiltIn: true,
        isArchived: false,
        createdById: systemUser!.id,
        departmentId,
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
                  ? { create: t.checklist.map((text, ci) => ({ text, position: ci })) }
                  : undefined,
              })),
            },
          })),
        },
      },
    });
    console.log(`  ✓ ${tmpl.name}`);
  }

  // 4. Seed general templates
  console.log("\n📋 General templates…");
  for (const tmpl of GENERAL_TEMPLATES) await createTemplate(tmpl, null);

  // 5. Seed department templates
  console.log("\n🏢 Department templates…");
  for (const tmpl of DEPT_TEMPLATES) {
    const departmentId = tmpl.department ? (deptMap[tmpl.department] ?? null) : null;
    await createTemplate(tmpl, departmentId);
  }

  const total = GENERAL_TEMPLATES.length + DEPT_TEMPLATES.length;
  console.log(`\n✅ Seeded ${total} built-in templates across ${DEPARTMENTS.length} departments`);
}

main().catch(console.error).finally(() => db.$disconnect());
