import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req: Parameters<Parameters<typeof auth>[0]>[0]) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  const isPublicShare = req.nextUrl.pathname.startsWith("/share/");
  const isPublicApi = req.nextUrl.pathname.startsWith("/api/docs/") && req.nextUrl.pathname.endsWith("/public");

  if (isApiAuthRoute || isPublicShare || isPublicApi) return NextResponse.next();

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
