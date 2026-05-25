import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const USERS = [
  {
    name: "Aseem Jibran",
    email: "aseem.jibran@arthurlawrence.net",
    password: "admin123",
    role: "ADMIN",
    marketingRole: "MARKETING_MANAGER",
    department: "Leadership",
  },
  {
    name: "Muhammad Usman",
    email: "muhammad.usman1@arthurlawrence.net",
    password: "admin123",
    role: "ADMIN",
    marketingRole: "MARKETING_MANAGER",
    department: "Marketing",
  },
  {
    name: "Wajeeha Abid",
    email: "wajeeha.abid@arthurlawrence.net",
    password: "admin123",
    role: "ADMIN",
    marketingRole: "MARKETING_MANAGER",
    department: "Marketing",
  },
  {
    name: "Saad Hassan",
    email: "saad.hassan@arthurlawrence.net",
    password: "member123",
    role: "TEAM_MEMBER",
    marketingRole: "GRAPHIC_DESIGNER",
    department: "Creative",
  },
  {
    name: "Abdul Rafay",
    email: "abdul.rafay1@arthurlawrence.net",
    password: "member123",
    role: "TEAM_MEMBER",
    marketingRole: "SEO_SPECIALIST",
    department: "Digital Marketing",
  },
  {
    name: "Javeria Musvi",
    email: "javeria.musvi@arthurlawrence.net",
    password: "member123",
    role: "TEAM_MEMBER",
    marketingRole: "SOCIAL_MEDIA_MANAGER",
    department: "Social",
  },
  {
    name: "Hussain Moosavi",
    email: "hussain.raza@arthurlawrence.net",
    password: "member123",
    role: "TEAM_MEMBER",
    marketingRole: "SOCIAL_MEDIA_MANAGER",
    department: "Social",
  },
  {
    name: "Abdullah Bin Zubair",
    email: "abdullah.zubair@arthurlawrence.net",
    password: "member123",
    role: "TEAM_MEMBER",
    marketingRole: "VIDEO_EDITOR",
    department: "Creative",
  },
  {
    name: "Fawwaz Sajjad",
    email: "fawwaz.sajjad@arthurlawrence.net",
    password: "member123",
    role: "TEAM_MEMBER",
    marketingRole: "SEO_SPECIALIST",
    department: "Digital Marketing",
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await db.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        passwordHash,
        role: u.role,
        marketingRole: u.marketingRole,
        department: u.department,
        isActive: true,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        marketingRole: u.marketingRole,
        department: u.department,
        isActive: true,
      },
    });
  }

  console.log("✅ Users upserted");

  // Create default workspace
  const workspace = await db.workspace.upsert({
    where: { slug: "arthur-lawrence" },
    update: {},
    create: {
      name: "Arthur Lawrence",
      slug: "arthur-lawrence",
      description: "Arthur Lawrence Marketing Hub",
      color: "#e8170b",
    },
  });
  console.log(`✅ Default workspace "${workspace.name}" ready`);

  // Add all users as workspace members
  const allUsers = await db.user.findMany({ select: { id: true, role: true, email: true } });
  for (const user of allUsers) {
    const isOwner = user.email === "aseem.jibran@arthurlawrence.net";
    await db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: isOwner ? "OWNER" : user.role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
    });
  }
  console.log(`✅ All users added to workspace`);

  // Backfill existing campaigns
  const backfilled = await db.campaign.updateMany({
    where: { workspaceId: null },
    data: { workspaceId: workspace.id },
  });
  console.log(`✅ Backfilled ${backfilled.count} campaigns to default workspace`);

  console.log("\n🎉 Database ready!\n");
  console.log("Login Credentials:");
  console.log("  Aseem Jibran:      aseem.jibran@arthurlawrence.net    / admin123");
  console.log("  Muhammad Usman:    muhammad.usman1@arthurlawrence.net  / admin123");
  console.log("  Wajeeha Abid:      wajeeha.abid@arthurlawrence.net    / admin123");
  console.log("  All team members:  [their email]                       / member123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
