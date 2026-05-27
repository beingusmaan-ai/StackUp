"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FilePlus, Search, Globe, Lock, MoreHorizontal, Trash2,
  ChevronDown, FileText, Megaphone, CheckSquare,
  Pencil, Copy, Link2, FolderInput, X, Share2,
  SlidersHorizontal, ArrowUpDown, User, Calendar, MapPin, Type, Upload,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import { ShareModal } from "@/components/docs/ShareModal";

type FilterField = "title" | "location" | "createdBy" | "dateUpdated" | "dateCreated";
interface FilterRow { id: string; field: FilterField | ""; value: string }

type SortField = "createdAt" | "updatedAt";
type SortDir = "asc" | "desc";

const FIELD_LABELS: Record<FilterField, string> = {
  title: "Title", location: "Projects", createdBy: "Created by",
  dateUpdated: "Date updated", dateCreated: "Date created",
};

const DATE_OPTIONS = [
  { value: "today",     label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7",         label: "Last 7 days" },
  { value: "30",        label: "Last 30 days" },
  { value: "90",        label: "Last 3 months" },
];

type Doc = {
  id: string;
  title: string;
  icon?: string | null;
  parentId?: string | null;
  isPublic?: boolean;
  updatedAt: string;
  createdAt: string;
  createdById: string;
  createdBy: { id: string; name: string };
  campaign?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
};

const TEMPLATE_CATEGORIES = [
  { id: "all",       label: "All" },
  { id: "marketing", label: "Marketing" },
  { id: "planning",  label: "Planning" },
  { id: "team",      label: "Team" },
];

const TEMPLATES = [
  {
    id: "campaign-brief", category: "marketing", icon: "🚀",
    title: "Campaign Brief",
    desc: "Strategy, audience, channels, and success metrics",
    bg: "from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Campaign Overview" }] },
      { type: "paragraph", content: [{ type: "text", text: "Provide a brief summary — what this campaign is, why we're running it, and what we hope to achieve." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Objectives" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Objective 1 — e.g. increase brand awareness by 20%" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Objective 2 — e.g. generate 500 qualified leads" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Objective 3 — e.g. drive $50K in attributed revenue" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Target Audience" }] },
      { type: "paragraph", content: [{ type: "text", text: "Describe your ideal customer — demographics, psychographics, pain points, and motivations." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key Messages" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Primary: What is the single most important thing to communicate?" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Supporting message 1" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Supporting message 2" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Channels & Tactics" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Social Media — platforms, formats, frequency" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Email — audience segment, number of sends" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Paid Ads — channels, targeting, budget split" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Content / SEO — topics, keywords" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Budget" }] },
      { type: "paragraph", content: [{ type: "text", text: "Total budget: $___" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Timeline" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Planning: [Start] – [End]" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Production: [Start] – [End]" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Launch: [Date]" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Review: [Date]" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Success Metrics" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Impressions: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Click-through rate: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Conversions: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "ROI: ___" }] }] },
      ]},
    ]},
  },
  {
    id: "social-media", category: "marketing", icon: "📱",
    title: "Social Media Strategy",
    desc: "Content pillars, posting schedule, and KPIs",
    bg: "from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Platform Overview" }] },
      { type: "paragraph", content: [{ type: "text", text: "Summarize which platforms you're focusing on and why they make sense for your audience." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Content Pillars" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Educational — Tips, how-tos, and industry insights" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Inspirational — Success stories, quotes, behind-the-scenes" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Promotional — Product launches, offers, announcements" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Engagement — Polls, questions, user-generated content" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Posting Schedule" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Instagram: ___ posts/week" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "LinkedIn: ___ posts/week" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Twitter / X: ___ posts/day" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "TikTok: ___ posts/week" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Tone & Voice" }] },
      { type: "paragraph", content: [{ type: "text", text: "Describe how your brand sounds on social — the words you use, what you avoid, and the personality you project." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "KPIs" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Follower growth: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Engagement rate: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Reach / impressions: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Website clicks: ___" }] }] },
      ]},
    ]},
  },
  {
    id: "email-campaign", category: "marketing", icon: "📧",
    title: "Email Campaign",
    desc: "Subject lines, structure, A/B tests, and metrics",
    bg: "from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Campaign Goal" }] },
      { type: "paragraph", content: [{ type: "text", text: "What do you want this email campaign to achieve? Be specific and measurable." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Audience Segment" }] },
      { type: "paragraph", content: [{ type: "text", text: "Who are you sending to? Why this segment? Estimated list size: ___" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Subject Line Options" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Option A: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Option B: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Option C: " }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Email Structure" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Header / Hero — describe the visual" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Opening line — hook the reader in one sentence" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Body copy — key message and supporting details" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "CTA button — Text: \"___\" → URL: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Footer — unsubscribe link, social icons, address" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A/B Test Plan" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Subject line A vs B" }] }] },
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "CTA copy variation" }] }] },
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Send time variation" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Success Metrics" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Open rate target: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Click-through rate target: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Conversions target: ___" }] }] },
      ]},
    ]},
  },
  {
    id: "brand-guidelines", category: "marketing", icon: "🎨",
    title: "Brand Guidelines",
    desc: "Colors, typography, logo rules, and tone of voice",
    bg: "from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Mission & Vision" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Mission: ..." }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Vision: ..." }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Brand Personality" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Trait 1 — description" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Trait 2 — description" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Trait 3 — description" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Logo Usage" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Minimum size: ___px" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Required clear space: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Acceptable backgrounds: White, Dark, Brand color" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Never stretch, rotate, or recolor the logo" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Color Palette" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Primary: #______" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Secondary: #______" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Accent: #______" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Background: #______" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Typography" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Heading font: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Body font: ___" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Accent / mono font: ___" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Tone of Voice" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "We are: [adjective], [adjective], [adjective]" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "We are not: [adjective], [adjective], [adjective]" }] }] },
      ]},
    ]},
  },
  {
    id: "project-overview", category: "planning", icon: "🎯",
    title: "Project Overview",
    desc: "Summarize goals, scope, milestones, and team",
    bg: "from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Goals" }] },
      { type: "paragraph", content: [{ type: "text", text: "Describe the main goals of this project..." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Scope" }] },
      { type: "paragraph", content: [{ type: "text", text: "What is included and excluded..." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Milestones" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Milestone 1 — description" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Milestone 2 — description" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Team" }] },
      { type: "paragraph", content: [{ type: "text", text: "List team members and their roles..." }] },
    ]},
  },
  {
    id: "okrs", category: "planning", icon: "🏆",
    title: "OKRs & Goals",
    desc: "Objectives, key results, and progress check-ins",
    bg: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Q___ / ___ Goals" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Objective 1: [Name]" }] },
      { type: "paragraph", content: [{ type: "text", text: "Why this matters: ..." }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "KR 1.1: [measurable outcome]" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "KR 1.2: [measurable outcome]" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "KR 1.3: [measurable outcome]" }] }] },
      ]},
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Objective 2: [Name]" }] },
      { type: "paragraph", content: [{ type: "text", text: "Why this matters: ..." }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "KR 2.1: [measurable outcome]" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "KR 2.2: [measurable outcome]" }] }] },
      ]},
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Objective 3: [Name]" }] },
      { type: "paragraph", content: [{ type: "text", text: "Why this matters: ..." }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "KR 3.1: [measurable outcome]" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "KR 3.2: [measurable outcome]" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Progress Check-ins" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Mid-quarter review" }] }] },
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "End-of-quarter review" }] }] },
      ]},
    ]},
  },
  {
    id: "competitive-analysis", category: "planning", icon: "🔍",
    title: "Competitive Analysis",
    desc: "Competitor research, positioning, and opportunities",
    bg: "from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Overview" }] },
      { type: "paragraph", content: [{ type: "text", text: "Why we're doing this analysis and what decisions it will inform." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Competitor 1: [Name]" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Website: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Target audience: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Strengths: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Weaknesses: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Notable marketing tactics: " }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Competitor 2: [Name]" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Website: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Target audience: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Strengths: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Weaknesses: " }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Our Positioning" }] },
      { type: "paragraph", content: [{ type: "text", text: "How do we differentiate? What is our unique value proposition?" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Opportunities & Threats" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Opportunity: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Opportunity: " }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Threat: " }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key Takeaways" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Takeaway 1" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Takeaway 2" }] }] },
      ]},
    ]},
  },
  {
    id: "meeting-notes", category: "team", icon: "📝",
    title: "Meeting Notes",
    desc: "Agenda, notes, and action items",
    bg: "from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Agenda" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 1" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 2" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Notes" }] },
      { type: "paragraph", content: [{ type: "text", text: "Meeting notes go here..." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Action Items" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 1 — Owner" }] }] },
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 2 — Owner" }] }] },
      ]},
    ]},
  },
  {
    id: "retrospective", category: "team", icon: "🔄",
    title: "Sprint Retrospective",
    desc: "What went well, blockers, and team shoutouts",
    bg: "from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Sprint: [Name / Number]" }] },
      { type: "paragraph", content: [{ type: "text", text: "Date: ___  |  Team: ___" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What Went Well" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "..." }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "..." }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What Didn't Go Well" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "..." }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "..." }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Action Items" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 1 — Owner" }] }] },
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 2 — Owner" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Team Shoutouts" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "..." }] }] },
      ]},
    ]},
  },
  {
    id: "guidelines", category: "team", icon: "📋",
    title: "Guidelines",
    desc: "Standards, best practices, and do's and don'ts",
    bg: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Purpose" }] },
      { type: "paragraph", content: [{ type: "text", text: "Explain the purpose of these guidelines..." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Standards" }] },
      { type: "orderedList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Standard 1" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Standard 2" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Standard 3" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Do's and Don'ts" }] },
      { type: "paragraph", content: [{ type: "text", text: "List key do's and don'ts..." }] },
    ]},
  },
];

export default function DocsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [showTemplates, setShowTemplates] = useState(true);
  const [templateCategory, setTemplateCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<{ id: string; title: string } | null>(null);
  const [moveCampaigns, setMoveCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [moveTasks, setMoveTasks] = useState<{ id: string; title: string }[]>([]);
  const [moveTab, setMoveTab] = useState<"campaign" | "task">("campaign");
  const [moveSearch, setMoveSearch] = useState("");

  // Filter & sort state
  const [filterRows, setFilterRows] = useState<FilterRow[]>([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [filterCampaigns, setFilterCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["docs"],
    queryFn: async () => { const r = await fetch("/api/docs"); return r.json(); },
  });
  const docs: Doc[] = data?.data || [];

  const createDoc = useMutation({
    mutationFn: async (opts: { title: string; content?: object; icon?: string }) => {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      return res.json();
    },
    onSuccess: ({ data: newDoc }) => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      router.push(`/docs/${newDoc.id}`);
    },
    onError: () => toast.error("Failed to create doc"),
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      toast.success("Doc deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const renameDoc = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      await fetch(`/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docs"] }),
    onError: () => toast.error("Failed to rename"),
  });

  const duplicateDoc = useMutation({
    mutationFn: async (doc: Doc) => {
      const full = await fetch(`/api/docs/${doc.id}`).then((r) => r.json());
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${doc.title} (Copy)`,
          icon: doc.icon,
          content: full.data?.content,
        }),
      });
      return res.json();
    },
    onSuccess: ({ data: newDoc }) => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      toast.success("Doc duplicated");
      router.push(`/docs/${newDoc.id}`);
    },
    onError: () => toast.error("Failed to duplicate"),
  });

  const moveDoc = useMutation({
    mutationFn: async ({ id, campaignId, taskId }: { id: string; campaignId?: string; taskId?: string }) => {
      await fetch(`/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaignId ?? "", taskId: taskId ?? "" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      toast.success("Doc moved");
      setShowMoveModal(null);
    },
    onError: () => toast.error("Failed to move"),
  });

  const openMoveModal = (doc: Doc) => {
    setShowMoveModal({ id: doc.id, title: doc.title });
    setMoveTab("campaign");
    setMoveSearch("");
    fetch("/api/campaigns?picker=1").then((r) => r.json()).then((d) =>
      setMoveCampaigns((d.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    );
    fetch("/api/tasks?picker=1").then((r) => r.json()).then((d) =>
      setMoveTasks((d.data || []).map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })))
    );
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
    };
    if (showSortMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortMenu]);

  useEffect(() => {
    if (showFiltersPanel && filterCampaigns.length === 0) {
      fetch("/api/campaigns?picker=1")
        .then((r) => r.json())
        .then((d) => setFilterCampaigns((d.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))));
    }
  }, [showFiltersPanel, filterCampaigns.length]);

  const addFilterRow = () =>
    setFilterRows((prev) => [...prev, { id: Math.random().toString(36).slice(2), field: "", value: "" }]);

  const updateRow = (id: string, patch: Partial<FilterRow>) =>
    setFilterRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));

  const removeRow = (id: string) => setFilterRows((prev) => prev.filter((r) => r.id !== id));

  const uniqueCreators = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    docs.forEach((d) => { if (!seen.has(d.createdById)) seen.set(d.createdById, d.createdBy); });
    return Array.from(seen.values());
  }, [docs]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      const content = {
        type: "doc",
        content: paragraphs.length > 0
          ? paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p.replace(/\n/g, " ") }] }))
          : [{ type: "paragraph" }],
      };
      const title = file.name.replace(/\.[^.]+$/, "");
      createDoc.mutate({ title, content, icon: "📄" });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const childCount = (id: string) => docs.filter((d) => d.parentId === id).length;
  const rootDocs = docs.filter((d) => !d.parentId);

  const activeRowCount = filterRows.filter((r) => r.field && r.value).length;

  let filtered = (search
    ? docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    : rootDocs
  ).filter((doc) =>
    filterRows.every((row) => {
      if (!row.field || !row.value) return true;
      if (row.field === "title")       return doc.title.toLowerCase().includes(row.value.toLowerCase());
      if (row.field === "location") {
        return doc.campaign?.id === row.value;
      }
      if (row.field === "createdBy")   return doc.createdById === row.value;
      if (row.field === "dateUpdated" || row.field === "dateCreated") {
        const docDate = new Date(row.field === "dateUpdated" ? doc.updatedAt : doc.createdAt);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        if (row.value === "today")     return docDate >= today;
        if (row.value === "yesterday") return docDate >= yesterday && docDate < today;
        const days = parseInt(row.value, 10);
        if (!isNaN(days)) { const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days); return docDate >= cutoff; }
      }
      return true;
    })
  );

  filtered = [...filtered].sort((a, b) => {
    const cmp = sortField === "createdAt"
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">All Docs</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowNewMenu((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-sm font-semibold transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              New Doc
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showNewMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-background border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                <button
                  onClick={() => { setShowNewMenu(false); createDoc.mutate({ title: "Untitled", icon: "📄" }); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#e8170b]" /> Blank page
                </button>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setShowNewMenu(false); createDoc.mutate({ title: t.title, content: t.content, icon: t.icon }); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <span className="text-base">{t.icon}</span> {t.title}
                  </button>
                ))}
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => { setShowNewMenu(false); importInputRef.current?.click(); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Upload className="w-4 h-4 text-[#e8170b]" /> Import doc
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Templates section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Templates</span>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setTemplateCategory(cat.id); setShowTemplates(true); }}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                templateCategory === cat.id && showTemplates
                  ? "bg-[#e8170b] text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {cat.label}
            </button>
          ))}
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTemplates ? "Hide" : "Show"}
          </button>
        </div>

        {showTemplates && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {TEMPLATES
              .filter((t) => templateCategory === "all" || t.category === templateCategory)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => createDoc.mutate({ title: t.title, content: t.content, icon: t.icon })}
                  disabled={createDoc.isPending}
                  className={cn(
                    "flex flex-col gap-2.5 p-3 rounded-xl border border-border bg-gradient-to-br text-left hover:shadow-md transition-all hover:scale-[1.01] disabled:opacity-60 group",
                    t.bg
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{t.desc}</p>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setShowFiltersPanel((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
            showFiltersPanel || activeRowCount > 0
              ? "border-[#e8170b] text-[#e8170b] bg-[#e8170b]/5"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeRowCount > 0 && (
            <span className="ml-0.5 min-w-[16px] h-[16px] bg-[#e8170b] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {activeRowCount}
            </span>
          )}
        </button>

        {/* Sort */}
        <div className="relative" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort
            {sortDir === "asc" ? " ↑" : " ↓"}
          </button>
          {showSortMenu && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-background border border-border rounded-xl shadow-xl z-50 py-1">
              {([
                { field: "createdAt" as SortField, label: "Date created" },
                { field: "updatedAt" as SortField, label: "Date updated" },
              ] as const).map((o) => (
                <button
                  key={o.field}
                  onClick={() => {
                    if (sortField === o.field) setSortDir((d) => d === "asc" ? "desc" : "asc");
                    else { setSortField(o.field); setSortDir("asc"); }
                    setShowSortMenu(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                    sortField === o.field ? "text-[#e8170b] font-medium" : "text-foreground"
                  )}
                >
                  {o.label}
                  {sortField === o.field && <span className="text-[10px] text-muted-foreground">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Count + search (right) */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {filtered.length} doc{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search docs…"
              className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-muted text-xs focus:outline-none focus:ring-2 focus:ring-[#e8170b] w-48"
            />
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {showFiltersPanel && (
        <div className="mb-4 bg-background border border-border rounded-xl shadow-sm p-4">
          <p className="text-sm font-bold text-foreground mb-3">Filters</p>

          {filterRows.length === 0 && (
            <p className="text-xs text-muted-foreground mb-3">No filters yet. Click "+ Add filter" to start.</p>
          )}

          <div className="space-y-2">
            {filterRows.map((row) => (
              <div key={row.id} className="flex items-center gap-2">

                {/* Field */}
                <select
                  value={row.field}
                  onChange={(e) => updateRow(row.id, { field: e.target.value as FilterField | "", value: "" })}
                  className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] w-36 cursor-pointer"
                >
                  <option value="">Select field…</option>
                  {(Object.keys(FIELD_LABELS) as FilterField[]).map((f) => (
                    <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] w-16 cursor-pointer"
                  defaultValue="is"
                >
                  <option value="is">Is</option>
                </select>

                {/* Value */}
                {(!row.field) && (
                  <select disabled className="flex-1 px-2.5 py-1.5 text-xs bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed">
                    <option>Select value…</option>
                  </select>
                )}
                {row.field === "title" && (
                  <input
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    placeholder="Enter title…"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
                  />
                )}
                {row.field === "location" && (
                  <select
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer"
                  >
                    <option value="">Select project…</option>
                    {filterCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                {row.field === "createdBy" && (
                  <select
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer"
                  >
                    <option value="">Select person…</option>
                    {uniqueCreators.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
                {(row.field === "dateUpdated" || row.field === "dateCreated") && (
                  <select
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer"
                  >
                    <option value="">Select period…</option>
                    {DATE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}

                {/* Delete row */}
                <button
                  onClick={() => removeRow(row.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addFilterRow}
            className="mt-3 text-xs text-[#e8170b] font-medium hover:underline"
          >
            + Add filter
          </button>
        </div>
      )}

      {/* Docs table */}
      <div className="bg-card border border-border rounded-2xl">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_160px_140px_110px_36px] gap-4 px-4 py-2.5 border-b border-border bg-muted/40 rounded-t-2xl">
          <span className="text-xs font-semibold text-muted-foreground">Name</span>
          <span className="text-xs font-semibold text-muted-foreground">Location</span>
          <span className="text-xs font-semibold text-muted-foreground">Date updated</span>
          <span className="text-xs font-semibold text-muted-foreground">Sharing</span>
          <span />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No docs match your search" : "No docs yet"}
            </p>
            {!search && (
              <button
                onClick={() => createDoc.mutate({ title: "Untitled", icon: "📄" })}
                className="mt-3 text-sm text-[#e8170b] hover:underline"
              >
                Create your first doc
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((doc) => {
              const children = childCount(doc.id);
              const isOwn = doc.createdById === session?.user?.id;

              return (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/docs/${doc.id}`)}
                  className="grid grid-cols-[1fr_160px_140px_110px_36px] gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors group relative items-center"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg flex-shrink-0">{doc.icon || "📄"}</span>
                    <span className="text-sm font-medium text-foreground truncate">{doc.title || "Untitled"}</span>
                    {children > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md flex-shrink-0">
                        <FileText className="w-2.5 h-2.5" />{children}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <div className="min-w-0">
                    {doc.campaign ? (
                      <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 truncate">
                        <Megaphone className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{doc.campaign.name}</span>
                      </span>
                    ) : doc.task ? (
                      <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 truncate">
                        <CheckSquare className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{doc.task.title}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Date updated */}
                  <span className="text-xs text-muted-foreground">{formatRelative(doc.updatedAt)}</span>

                  {/* Sharing */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShareDoc(doc)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors group/share"
                      title={doc.isPublic ? "Public — click to manage sharing" : "Private — click to share"}
                    >
                      {doc.isPublic ? (
                        <Globe className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/share:text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground group-hover/share:text-foreground transition-colors">
                        {doc.isPublic ? "Public" : "Share"}
                      </span>
                    </button>
                  </div>

                  {/* ⋯ menu — own column */}
                  <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === doc.id ? null : doc.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpenId === doc.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-xl shadow-xl z-50 py-1">
                        <button
                          onClick={() => { router.push(`/docs/${doc.id}`); setMenuOpenId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Open
                        </button>
                        <button
                          onClick={() => {
                            const newTitle = window.prompt("Rename doc:", doc.title);
                            if (newTitle && newTitle.trim() && newTitle !== doc.title) {
                              renameDoc.mutate({ id: doc.id, title: newTitle.trim() });
                            }
                            setMenuOpenId(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Rename
                        </button>
                        <button
                          onClick={() => { openMoveModal(doc); setMenuOpenId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <FolderInput className="w-3.5 h-3.5 text-muted-foreground" /> Move to Project/Task
                        </button>
                        <button
                          onClick={() => { duplicateDoc.mutate(doc); setMenuOpenId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Duplicate
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/docs/${doc.id}`);
                            toast.success("Link copied");
                            setMenuOpenId(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5 text-muted-foreground" /> Copy Link
                        </button>
                        {isOwn && (
                          <>
                            <div className="my-1 border-t border-border" />
                            <button
                              onClick={() => { if (confirm("Delete this doc?")) { deleteDoc.mutate(doc.id); setMenuOpenId(null); } }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share modal */}
      {shareDoc && (
        <ShareModal
          docId={shareDoc.id}
          docTitle={shareDoc.title}
          isPublic={shareDoc.isPublic ?? false}
          createdBy={shareDoc.createdBy}
          onClose={() => { setShareDoc(null); queryClient.invalidateQueries({ queryKey: ["docs"] }); }}
          onPublicToggle={() => queryClient.invalidateQueries({ queryKey: ["docs"] })}
        />
      )}

      {/* Hidden import file input */}
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,.md"
        className="hidden"
        onChange={handleImport}
      />

      {/* Move to Project/Task modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowMoveModal(null)}>
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-80 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate pr-2">Move "{showMoveModal.title}"</p>
              <button onClick={() => setShowMoveModal(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => { setMoveTab("campaign"); setMoveSearch(""); }}
                className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                  moveTab === "campaign" ? "text-[#e8170b] border-b-2 border-[#e8170b]" : "text-muted-foreground hover:text-foreground")}
              >
                <Megaphone className="w-3.5 h-3.5" /> Projects
              </button>
              <button
                onClick={() => { setMoveTab("task"); setMoveSearch(""); }}
                className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                  moveTab === "task" ? "text-[#e8170b] border-b-2 border-[#e8170b]" : "text-muted-foreground hover:text-foreground")}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Tasks
              </button>
            </div>

            {/* Search */}
            <div className="p-2">
              <input
                value={moveSearch}
                onChange={(e) => setMoveSearch(e.target.value)}
                placeholder={`Search ${moveTab === "campaign" ? "projects" : "tasks"}…`}
                className="w-full px-3 py-1.5 text-xs bg-muted rounded-lg outline-none"
                autoFocus
              />
            </div>

            {/* List */}
            <div className="max-h-52 overflow-y-auto pb-2">
              {moveTab === "campaign"
                ? moveCampaigns
                    .filter((c) => c.name.toLowerCase().includes(moveSearch.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => moveDoc.mutate({ id: showMoveModal.id, campaignId: c.id, taskId: "" })}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted transition-colors text-left"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        {c.name}
                      </button>
                    ))
                : moveTasks
                    .filter((t) => t.title.toLowerCase().includes(moveSearch.toLowerCase()))
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => moveDoc.mutate({ id: showMoveModal.id, taskId: t.id, campaignId: "" })}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted transition-colors text-left"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        {t.title}
                      </button>
                    ))
              }
            </div>

            {/* Remove link footer */}
            <div className="border-t border-border p-2">
              <button
                onClick={() => moveDoc.mutate({ id: showMoveModal.id, campaignId: "", taskId: "" })}
                className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors text-left"
              >
                Remove link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
