import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { ProfileForm } from "@/components/settings/ProfileForm";

export const metadata = { title: "Settings" };


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

        <div className="grid grid-cols-2 gap-4 text-sm mb-5">
          <div>
            <p className="text-xs text-muted-foreground mb-1">System Role</p>
            <p className="font-medium">{user.role}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Member since</p>
            <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Department</p>
            <p className="font-medium">
              {user.departmentMemberships.length > 0
                ? user.departmentMemberships.map((m) => m.department.name).join(", ")
                : "—"}
            </p>
          </div>
        </div>

        <ProfileForm
          userId={user.id}
          initialName={user.name}
          initialMarketingRole={user.marketingRole}
        />
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
