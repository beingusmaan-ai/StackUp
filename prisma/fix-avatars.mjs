import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load DATABASE_URL from .env
const envPath = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
}

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({ select: { id: true, image: true, avatarData: true } });
  let fixed = 0;

  for (const user of users) {
    if (user.image && user.image.startsWith("data:")) {
      await db.user.update({
        where: { id: user.id },
        data: {
          avatarData: user.image,           // move base64 to avatarData
          image: `/api/users/${user.id}/avatar`,  // short URL in image
        },
      });
      fixed++;
      console.log(`Fixed user ${user.id}`);
    }
  }

  console.log(`Done. Fixed ${fixed} user(s).`);
}

main().catch(console.error).finally(() => db.$disconnect());
