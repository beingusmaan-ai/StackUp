import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Never put base64 data URLs into the JWT — they balloon the cookie past Vercel's 8 KB header limit.
function safeImage(image: string | null | undefined): string | null {
  if (!image || image.startsWith("data:")) return null;
  return image;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id ?? "";
        token.email = user.email ?? "";
        token.role = (user as { role: string }).role;
        token.marketingRole = (user as { marketingRole?: string }).marketingRole;
        token.image = safeImage((user as { image?: string | null }).image);
      } else if (token.email) {
        // Refresh role and name from DB on every token refresh so changes take effect without re-login
        const fresh = await db.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true, name: true, marketingRole: true, image: true },
        });
        if (fresh) {
          token.id = fresh.id;
          token.role = fresh.role;
          token.name = fresh.name;
          token.marketingRole = fresh.marketingRole;
          if (!token.image) token.image = safeImage(fresh.image);
        }
      }
      // Called when client-side update({ image }) is triggered
      if (trigger === "update" && "image" in (session ?? {})) {
        token.image = safeImage((session as { image?: string | null }).image);
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.marketingRole = token.marketingRole as string | null;
        session.user.image = (token.image as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string, isActive: true },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          marketingRole: user.marketingRole,
        };
      },
    }),
  ],
});
