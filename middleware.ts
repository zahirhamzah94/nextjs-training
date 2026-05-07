import { NextResponse, type NextRequest } from "next/server";

function isPathProtected(pathname: string) {
  if (pathname === "/protected" || pathname.startsWith("/protected/")) return true;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
  if (pathname === "/users" || pathname.startsWith("/users/")) return true;
  if (pathname === "/posts" || pathname.startsWith("/posts/")) return true;
  if (pathname === "/categories" || pathname.startsWith("/categories/")) return true;
  if (pathname === "/audit-logs" || pathname.startsWith("/audit-logs/")) return true;
  return false;
}

function base64urlDecodeToString(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function getRoles(request: NextRequest) {
  const cookie = request.cookies.get("tp_roles")?.value;
  if (!cookie) return [];
  try {
    const parsed = JSON.parse(base64urlDecodeToString(cookie)) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function hasAnyRole(userRoles: string[], requiredAnyOf: string[]) {
  if (requiredAnyOf.length === 0) return true;
  const set = new Set(userRoles);
  return requiredAnyOf.some((r) => set.has(r));
}

function requiredRolesForPath(pathname: string) {
  if (pathname === "/users" || pathname.startsWith("/users/")) return ["admin"];
  if (pathname === "/audit-logs" || pathname.startsWith("/audit-logs/")) return ["admin", "auditor"];
  if (pathname === "/posts" || pathname.startsWith("/posts/")) return ["admin", "editor"];
  if (pathname === "/categories" || pathname.startsWith("/categories/")) return ["admin", "editor"];
  if (pathname === "/dashboard/posts" || pathname.startsWith("/dashboard/posts/")) return ["admin", "editor"];
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return ["admin", "trainer", "editor", "auditor"];
  if (pathname === "/protected" || pathname.startsWith("/protected/")) return [];
  return [];
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const startedAt = Date.now();

  if (isPathProtected(pathname)) {
    const session = request.cookies.get("tp_session")?.value;
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    const requiredRoles = requiredRolesForPath(pathname);
    if (requiredRoles.length > 0) {
      const roles = getRoles(request);
      if (!hasAnyRole(roles, requiredRoles)) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("error", "forbidden");
        return NextResponse.redirect(url);
      }
    }
  }

  const response = NextResponse.next();
  const durationMs = Date.now() - startedAt;
  console.log(`[MIDDLEWARE] ${request.method} ${pathname} ${durationMs}ms`);
  return response;
}

export const config = {
  matcher: [
    "/protected/:path*",
    "/dashboard/:path*",
    "/users/:path*",
    "/posts/:path*",
    "/categories/:path*",
    "/audit-logs/:path*",
  ],
};

