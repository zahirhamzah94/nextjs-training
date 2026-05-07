import { cookies } from "next/headers";

export type SessionUser = {
  sub?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
};

function base64urlDecodeToString(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function parseJsonCookie<T>(cookieValue: string | undefined): T | undefined {
  if (!cookieValue) return undefined;
  try {
    return JSON.parse(base64urlDecodeToString(cookieValue)) as T;
  } catch {
    return undefined;
  }
}

export async function getSession() {
  const store = await cookies();
  const authenticated = store.get("tp_session")?.value === "1";
  const user = parseJsonCookie<SessionUser>(store.get("tp_user")?.value);
  const roles = parseJsonCookie<string[]>(store.get("tp_roles")?.value) ?? [];
  return { authenticated, user, roles };
}

export function hasAnyRole(userRoles: string[], requiredAnyOf: string[]) {
  if (requiredAnyOf.length === 0) return true;
  const set = new Set(userRoles);
  return requiredAnyOf.some((r) => set.has(r));
}

export async function requireAuth() {
  const { authenticated } = await getSession();
  if (!authenticated) {
    throw new Error("Unauthorized");
  }
}

export async function requireAnyRole(requiredAnyOf: string[]) {
  const { authenticated, roles } = await getSession();
  if (!authenticated) {
    throw new Error("Unauthorized");
  }
  if (!hasAnyRole(roles, requiredAnyOf)) {
    throw new Error("Forbidden");
  }
}
