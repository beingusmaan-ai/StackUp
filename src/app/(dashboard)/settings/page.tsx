import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { AvatarUpload } from "@/components/settings/AvatarUpload";

export const metadata = { title: "Settings" };

const MARKETING_ROLE_LABELS: Record<string, string> = {
  CONTENT_WRITER: "Content Writer",
  GRAPHIC_DESIGNER: "Graphic Designer",
  VIDEO_EDITOR: "Video Editor",
  SOCIAL_MEDIA_MANAGER: "Social Media Manager",
  SEO_SPECIALIST: "SEO Specialist",
  PERFORMANCE_MARKETER: "Performance Marketer",
  CRM_EMAIL_MARKETER: "CRM/Email Marketer",
  MARKETING_MANAGER: "Marketing Manager",
};

export default async function SettingsPage() {
  const session = await auth();

  const user = await db.user.findUnique({
    where: { id: session?.user.id },
    select: {
      id: true, name: true, email: true, role: true, marketingRole: true, createdAt: true, image: true,
      departmentMemberships: { select: { department: { select: { name: true } } } },
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account" />

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Profile</h2>
        <div className="mb-6">
          <AvatarUpload name={user.name} currentImage={user.image} />
          <p className="text-sm text-muted-foreground mt-3">{user.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">System Role</p>
            <p className="font-medium">{user.role}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Marketing Role</p>
            <p className="font-medium">{user.marketingRole ? MARKETING_ROLE_LABELS[user.marketingRole] : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Department</p>
            <p className="font-medium">
              {user.departmentMemberships.length > 0
                ? user.departmentMemberships.map((m) => m.department.name).join(", ")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Member since</p>
            <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-2">Appearance</h2>
        <p className="text-sm text-muted-foreground">Use the sun/moon icon in the top bar to toggle between light and dark mode.</p>
      </div>

      {session?.user.role === "ADMIN" && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold mb-2">Admin Panel</h2>
          <p className="text-sm text-muted-foreground mb-3">
            As an admin, you can manage team members from the Team page.
          </p>
          <a href="/team" className="inline-flex items-center px-4 py-2 bg-[#e8170b] text-white rounded-xl text-sm font-medium hover:bg-[#c91409] transition-colors">
            Go to Team Management
          </a>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">Integrations</h2>
        <IntegrationsPanel isAdmin={session?.user.role === "ADMIN"} />
      </div>
    </div>
  );
}
