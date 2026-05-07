# Trainer Portal — Keycloak SSO + RBAC (Trainee Reference)

This repo implements **Keycloak SSO (OIDC Authorization Code + PKCE)**, an app-level **sign-in gate** (NRIC must exist locally), **RBAC** (route + mutation protection), and a basic UI shell (topbar, sidebar, notifications).

This document is written so a trainee can copy the same approach into a new app and get it working end-to-end.

## Goals

- Browser login redirects to Keycloak (no “login API call from the browser”).
- Callback verifies the token signature/claims and creates an app session.
- Sign-in gate: user must exist in local DB (matched by `nric`).
- RBAC: enforce roles in middleware and in server actions.
- Logout:
  - App logout always clears local cookies.
  - Optional: also log out from Keycloak **without redirecting** (backchannel logout using refresh_token).

## Quick Start (Works on port 3005)

1. Install deps:

```bash
npm i
```

2. Set environment variables (create `.env.local` and do NOT commit secrets):

```env
# Required (confidential client)
KEYCLOAK_CLIENT_ID=YOUR_CLIENT_ID
KEYCLOAK_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Option A (recommended): set issuer directly
# KEYCLOAK_ISSUER=https://sso.digital-id.my/realms/jdnprimms

# Option B (supported in this repo): derive issuer from base URL + realm
NEXT_PUBLIC_KEYCLOAK_BASE_URL=https://sso.digital-id.my
NEXT_PUBLIC_KEYCLOAK_REALM=jdnprimms

# Optional: where Keycloak should redirect after *front-channel* logout
NEXT_PUBLIC_POST_LOGOUT_REDIRECT=http://localhost:3005/auth/form/login

# Database
DATABASE_URL=mysql://USER:PASS@localhost:3306/trainer_portal
```

3. Apply DB schema + generate Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

4. Run:

```bash
npm run dev
```

Open:
- Landing: `http://localhost:3005/`
- Login: `http://localhost:3005/login`
- Dashboard: `http://localhost:3005/dashboard`

Port 3005 is configured here: [package.json](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/package.json#L5-L11)

## Keycloak Setup (Step-by-step)

### 1) Create a realm

- Realm: `jdnprimms` (example)

### 2) Create an OIDC Client (confidential)

In Keycloak Admin Console:
- Clients → Create client
  - Client ID: `primms` (example)
  - Client type: OpenID Connect
  - Client authentication: ON (confidential)
  - Standard flow: ON

Redirect URIs:
- `http://localhost:3005/api/auth/callback/keycloak`

Web origins:
- `http://localhost:3005`

### 3) Make sure tokens contain `nric` claim

The sign-in gate expects `id_token.nric`.

Typical ways to do this:
- Users have a user attribute called `nric`
- Add a protocol mapper:
  - Mapper type: “User Attribute”
  - User attribute: `nric`
  - Token claim name: `nric`
  - Claim JSON type: `String`
  - Add to ID token: ON
  - Add to access token: optional

If `nric` is missing, callback redirects to:
- `/auth/form/login?error=MYDIGITALID_PROFILE_INVALID`

### 4) Create users and set their NRIC

Create users in Keycloak and set a `nric` attribute that matches your local DB `User.nric`.

## Database Setup for Sign-in Gate (NRIC)

### Prisma schema change

User model includes:
- `nric String? @unique`

File: [schema.prisma](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/prisma/schema.prisma#L32-L42)

### Migration

Migration file:
- [migration.sql](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/prisma/migrations/20260507000000_add_nric_to_user/migration.sql)

### Seed / insert local users

The sign-in gate checks local DB:
- `User.nric` must match `id_token.nric`

So insert a local user row with the same NRIC as the Keycloak user attribute.

## Architecture Overview (Auth + RBAC)

### Login flow (OIDC Authorization Code + PKCE)

1. User opens `/login`
2. `/login` server component redirects to `/api/auth/login?next=...` (when configured)
3. `/api/auth/login` generates:
   - `state`, `nonce`, PKCE `code_verifier` + `code_challenge`
   - stores them in HttpOnly cookies
4. Redirects browser to Keycloak `/protocol/openid-connect/auth`
5. Keycloak authenticates user, redirects back to:
   - `/api/auth/callback/keycloak?code=...&state=...`
6. Callback exchanges `code` for tokens, verifies signature/claims (JWKS), then runs the sign-in gate:
   - requires `nric` claim
   - requires local DB user with matching `User.nric`
7. On success, sets app cookies (HttpOnly) and redirects to `next`.

### Sign-in gate behavior (NRIC)

If the user is not allowed:
- Missing NRIC claim:
  - redirect `/auth/form/login?error=MYDIGITALID_PROFILE_INVALID`
- NRIC not found in local DB:
  - (optional) silent Keycloak logout (backchannel)
  - redirect `/auth/form/login?error=MYDIGITALID_USER_NOT_REGISTERED`

### RBAC enforcement

Two layers:
1) Middleware protects routes (server edge):
- If not authenticated → redirect `/login?next=/requested/path`
- If missing required role → redirect `/?error=forbidden`

2) Server actions also enforce roles:
- `requireAnyRole(["admin"])`, etc.

## Files & Code (Copy/Paste Reference)

This section includes the **full code for every file touched by the Keycloak SSO + sign-in gate + RBAC implementation**, so trainees can reproduce the setup without needing extra materials.

### Files to create

- `app/api/auth/callback/keycloak/route.ts`
- `app/auth/form/login/page.tsx`
- `components/AppTopbar.tsx`
- `components/DashboardSidebar.tsx`
- `components/LoginErrorPopup.tsx`
- `README.KEYCLOAK_TRAINING.md`
- Prisma migration folder for NRIC (example below)

### Files to update

- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/layout.tsx`
- `app/login/page.tsx`
- `app/page.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `lib/auth.ts`
- `middleware.ts`
- `app/actions.ts`
- `app/dashboard/posts/actions.ts`
- `prisma/schema.prisma`
- `package.json`

### Full source listings

#### package.json

```json
{
  "name": "trainer-portal",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "seed": "prisma generate && tsx prisma/seed.ts",
    "dev": "next dev -p 3005",
    "build": "next build",
    "start": "next start -p 3005",
    "lint": "eslint"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/adapter-mariadb": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "@types/dotenv": "^6.1.1",
    "dotenv": "^17.2.0",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "zod": "^4.4.2"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "prisma": "^7.8.0",
    "tailwindcss": "^4",
    "tsx": "^4.21.0",
    "typescript": "^5"
  }
}
```

#### prisma/schema.prisma (NRIC column)

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema
//
// Get a free hosted Postgres database in seconds: `npx create-db`

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
}

enum Role {
  USER
  TRAINER
  ADMIN
}

enum AuditEntityType {
  USER
  POST
  CATEGORY
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  nric      String?  @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  profile   Profile?
  auditLogs AuditLog[] @relation("AuditActor")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id         Int      @id @default(autoincrement())
  title      String
  content    String?
  published  Boolean  @default(false)
  authorId   Int
  author     User     @relation(fields: [authorId], references: [id])
  categoryId Int
  category   Category @relation(fields: [categoryId], references: [id])
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String
  userId Int    @unique
  user   User   @relation(fields: [userId], references: [id])
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}

model AuditLog {
  id          Int             @id @default(autoincrement())
  action      AuditAction
  entityType  AuditEntityType
  entityId    Int
  actorUserId Int?
  actor       User?           @relation("AuditActor", fields: [actorUserId], references: [id], onDelete: SetNull)
  metadata    Json?
  createdAt   DateTime        @default(now())

  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([actorUserId])
}
```

#### prisma/migrations/20260507000000_add_nric_to_user/migration.sql

```sql
-- Add NRIC to User
ALTER TABLE `User` ADD COLUMN `nric` VARCHAR(191) NULL;

-- Unique index (MySQL allows multiple NULLs in a UNIQUE index)
CREATE UNIQUE INDEX `User_nric_key` ON `User`(`nric`);
```

#### lib/auth.ts (session + role helpers)

```ts
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
```

#### middleware.ts (route auth + RBAC)

```ts
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
```

#### app/api/auth/login/route.ts (redirect to Keycloak + PKCE)

```ts
import { randomBytes, createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll(/=+$/g, "");
}

function randomBase64Url(bytes: number) {
  return base64url(randomBytes(bytes));
}

function sha256Base64Url(value: string) {
  return base64url(createHash("sha256").update(value).digest());
}

function safeNextPath(value: string | null) {
  return typeof value === "string" && value.startsWith("/") ? value : "/protected";
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined;
  return value.trim().replaceAll(/^`|`$/g, "").replaceAll(/^"|"$/g, "").replaceAll(/^'|'$/g, "");
}

function normalizeUrl(value: string | undefined) {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return undefined;
  return normalized.replace(/\/+$/g, "");
}

function getKeycloakConfig(requestUrl: string) {
  const clientId = normalizeEnvValue(process.env["KEYCLOAK_CLIENT_ID"]);
  const clientSecret = process.env["KEYCLOAK_CLIENT_SECRET"];

  const issuer =
    normalizeUrl(process.env["KEYCLOAK_ISSUER"]) ??
    (() => {
      const baseUrl =
        normalizeUrl(process.env["KEYCLOAK_BASE_URL"]) ?? normalizeUrl(process.env["NEXT_PUBLIC_KEYCLOAK_BASE_URL"]);
      const realm =
        normalizeEnvValue(process.env["KEYCLOAK_REALM"]) ?? normalizeEnvValue(process.env["NEXT_PUBLIC_KEYCLOAK_REALM"]);
      if (!baseUrl || !realm) return undefined;
      return `${baseUrl}/realms/${realm}`;
    })();

  if (!issuer || !clientId) return null;

  const origin = new URL(requestUrl).origin;
  const redirectUri = `${origin}/api/auth/callback/keycloak`;
  return {
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    authorizationEndpoint: `${issuer.replace(/\/+$/g, "")}/protocol/openid-connect/auth`,
  };
}

function methodNotAllowed(method: string) {
  return Response.json(
    { error: `Method ${method} not allowed` },
    { status: 405, headers: { Allow: "GET, POST" } },
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const next = formData.get("next");
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/protected";

  const userIdRaw = formData.get("userId");
  const userId = typeof userIdRaw === "string" ? Number.parseInt(userIdRaw, 10) : NaN;

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  response.cookies.set("tp_session", "1", { httpOnly: true, sameSite: "lax", path: "/" });

  if (Number.isFinite(userId)) {
    response.cookies.set("tp_actorUserId", String(userId), { httpOnly: true, sameSite: "lax", path: "/" });
  } else {
    response.cookies.delete("tp_actorUserId");
  }

  return response;
}

export async function GET(request: NextRequest) {
  const config = getKeycloakConfig(request.url);
  if (!config) {
    return Response.json(
      {
        error:
          "Keycloak is not configured. Set KEYCLOAK_CLIENT_ID and either KEYCLOAK_ISSUER or (NEXT_PUBLIC_KEYCLOAK_BASE_URL + NEXT_PUBLIC_KEYCLOAK_REALM).",
      },
      { status: 500 },
    );
  }

  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const state = randomBase64Url(16);
  const nonce = randomBase64Url(16);
  const codeVerifier = randomBase64Url(32);
  const codeChallenge = sha256Base64Url(codeVerifier);

  const secure = request.nextUrl.protocol === "https:";
  const response = NextResponse.redirect(
    `${config.authorizationEndpoint}?${new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: "openid profile",
      prompt: "login",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }).toString()}`,
  );

  response.cookies.set("tp_oidc_state", state, { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 600 });
  response.cookies.set("tp_oidc_nonce", nonce, { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 600 });
  response.cookies.set("tp_pkce_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 600,
  });
  response.cookies.set("tp_login_next", nextPath, { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 600 });

  return response;
}

export async function PUT() {
  return methodNotAllowed("PUT");
}

export async function PATCH() {
  return methodNotAllowed("PATCH");
}

export async function DELETE() {
  return methodNotAllowed("DELETE");
}
```

#### app/api/auth/callback/keycloak/route.ts (callback + verification + sign-in gate)

```ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

function safeNextPath(value: string | undefined) {
  return typeof value === "string" && value.startsWith("/") ? value : "/protected";
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined;
  return value.trim().replaceAll(/^`|`$/g, "").replaceAll(/^"|"$/g, "").replaceAll(/^'|'$/g, "");
}

function normalizeUrl(value: string | undefined) {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return undefined;
  return normalized.replace(/\/+$/g, "");
}

function getKeycloakConfig(requestUrl: string) {
  const clientId = normalizeEnvValue(process.env["KEYCLOAK_CLIENT_ID"]);
  const clientSecret = process.env["KEYCLOAK_CLIENT_SECRET"];

  const issuer =
    normalizeUrl(process.env["KEYCLOAK_ISSUER"]) ??
    (() => {
      const baseUrl =
        normalizeUrl(process.env["KEYCLOAK_BASE_URL"]) ?? normalizeUrl(process.env["NEXT_PUBLIC_KEYCLOAK_BASE_URL"]);
      const realm =
        normalizeEnvValue(process.env["KEYCLOAK_REALM"]) ?? normalizeEnvValue(process.env["NEXT_PUBLIC_KEYCLOAK_REALM"]);
      if (!baseUrl || !realm) return undefined;
      return `${baseUrl}/realms/${realm}`;
    })();

  if (!issuer || !clientId) return null;

  const origin = new URL(requestUrl).origin;
  const redirectUri = `${origin}/api/auth/callback/keycloak`;
  const normalizedIssuer = issuer.replace(/\/+$/g, "");
  return {
    issuer: normalizedIssuer,
    clientId,
    clientSecret,
    redirectUri,
    tokenEndpoint: `${normalizedIssuer}/protocol/openid-connect/token`,
    jwksUri: `${normalizedIssuer}/protocol/openid-connect/certs`,
  };
}

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll(/=+$/g, "");
}

function base64urlDecodeToBuffer(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function decodeJwtPart(part: string): unknown {
  return JSON.parse(base64urlDecodeToBuffer(part).toString("utf8")) as unknown;
}

function parseJwt(token: string) {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) return null;
  const header = decodeJwtPart(headerPart);
  const payload = decodeJwtPart(payloadPart);
  const signature = base64urlDecodeToBuffer(signaturePart);
  const signedData = Buffer.from(`${headerPart}.${payloadPart}`, "utf8");
  return { header, payload, signature, signedData };
}

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

const jwksCache: { fetchedAt: number; keysByKid: Map<string, Jwk> } = {
  fetchedAt: 0,
  keysByKid: new Map(),
};

async function getJwk(jwksUri: string, kid: string) {
  const now = Date.now();
  if (now - jwksCache.fetchedAt > 10 * 60 * 1000) {
    jwksCache.keysByKid.clear();
  }

  const cached = jwksCache.keysByKid.get(kid);
  if (cached) return cached;

  const res = await fetch(jwksUri, { method: "GET" });
  if (!res.ok) return undefined;
  const json = (await res.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(json.keys) ? json.keys : [];
  jwksCache.fetchedAt = now;
  for (const k of keys) {
    if (k.kid) jwksCache.keysByKid.set(k.kid, k);
  }
  return jwksCache.keysByKid.get(kid);
}

async function verifyJwtRs256(input: { token: string; jwksUri: string }) {
  const parsed = parseJwt(input.token);
  if (!parsed || !parsed.header || typeof parsed.header !== "object") return null;
  const header = parsed.header as Record<string, unknown>;
  if (header.alg !== "RS256") return null;
  const kid = typeof header.kid === "string" ? header.kid : undefined;
  if (!kid) return null;

  const jwk = await getJwk(input.jwksUri, kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const ok = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    parsed.signature,
    parsed.signedData,
  );

  if (!ok || !parsed.payload || typeof parsed.payload !== "object") return null;
  return parsed.payload as Record<string, unknown>;
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function extractRoles(payload: Record<string, unknown>, clientId: string) {
  const roles = new Set<string>();

  const realmAccess = payload.realm_access;
  if (realmAccess && typeof realmAccess === "object") {
    for (const r of getStringArray((realmAccess as Record<string, unknown>).roles)) roles.add(r.toLowerCase());
  }

  const resourceAccess = payload.resource_access;
  if (resourceAccess && typeof payload.resource_access === "object") {
    const client = (resourceAccess as Record<string, unknown>)[clientId];
    if (client && typeof client === "object") {
      for (const r of getStringArray((client as Record<string, unknown>).roles)) roles.add(r.toLowerCase());
    }
  }

  return Array.from(roles).sort((a, b) => a.localeCompare(b));
}

export async function GET(request: NextRequest) {
  const config = getKeycloakConfig(request.url);
  if (!config) {
    return Response.json(
      {
        error:
          "Keycloak is not configured. Set KEYCLOAK_CLIENT_ID and either KEYCLOAK_ISSUER or (NEXT_PUBLIC_KEYCLOAK_BASE_URL + NEXT_PUBLIC_KEYCLOAK_REALM).",
      },
      { status: 500 },
    );
  }

  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const secure = request.nextUrl.protocol === "https:";
  const response = NextResponse.redirect(new URL("/login", request.url));

  const expectedState = request.cookies.get("tp_oidc_state")?.value;
  const expectedNonce = request.cookies.get("tp_oidc_nonce")?.value;
  const codeVerifier = request.cookies.get("tp_pkce_verifier")?.value;
  const nextPath = safeNextPath(request.cookies.get("tp_login_next")?.value);

  response.cookies.delete("tp_oidc_state");
  response.cookies.delete("tp_oidc_nonce");
  response.cookies.delete("tp_pkce_verifier");
  response.cookies.delete("tp_login_next");

  if (error) {
    return response;
  }

  if (!code || !state || !expectedState || state !== expectedState || !expectedNonce || !codeVerifier) {
    return response;
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  const tokenResponse = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenResponse.ok) {
    return response;
  }

  const tokenJson = (await tokenResponse.json()) as {
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const maxAge =
    typeof tokenJson.expires_in === "number" ? Math.max(1, Math.min(tokenJson.expires_in, 24 * 60 * 60)) : undefined;

  if (typeof tokenJson.id_token !== "string") {
    return response;
  }

  const idTokenPayload = await verifyJwtRs256({ token: tokenJson.id_token, jwksUri: config.jwksUri });
  if (!idTokenPayload) {
    return response;
  }

  const iss = typeof idTokenPayload.iss === "string" ? idTokenPayload.iss : undefined;
  const audRaw = idTokenPayload.aud;
  const aud =
    typeof audRaw === "string"
      ? [audRaw]
      : Array.isArray(audRaw)
        ? audRaw.filter((v): v is string => typeof v === "string")
        : [];

  const exp = typeof idTokenPayload.exp === "number" ? idTokenPayload.exp : undefined;
  const nonce = typeof idTokenPayload.nonce === "string" ? idTokenPayload.nonce : undefined;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (iss !== config.issuer || !aud.includes(config.clientId) || !exp || exp < nowSeconds - 30 || nonce !== expectedNonce) {
    return response;
  }

  const nric = typeof idTokenPayload.nric === "string" ? idTokenPayload.nric : undefined;
  if (!nric) {
    response.headers.set("Location", new URL("/auth/form/login?error=MYDIGITALID_PROFILE_INVALID", request.url).toString());
    return response;
  }

  const localUser = await prisma.user.findUnique({
    where: { nric },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!localUser) {
    if (typeof tokenJson.refresh_token === "string") {
      const logoutEndpoint = `${config.issuer.replace(/\/+$/g, "")}/protocol/openid-connect/logout`;
      const body = new URLSearchParams({
        client_id: config.clientId,
        refresh_token: tokenJson.refresh_token,
      });
      if (config.clientSecret) body.set("client_secret", config.clientSecret);
      await fetch(logoutEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    }

    response.headers.set("Location", new URL("/auth/form/login?error=MYDIGITALID_USER_NOT_REGISTERED", request.url).toString());
    return response;
  }

  const rolesSource =
    typeof tokenJson.access_token === "string"
      ? await verifyJwtRs256({ token: tokenJson.access_token, jwksUri: config.jwksUri })
      : undefined;
  void rolesSource;

  const roles = [String(localUser.role).toLowerCase()];

  const user = {
    sub: typeof idTokenPayload.sub === "string" ? idTokenPayload.sub : undefined,
    email: typeof localUser.email === "string" ? localUser.email : typeof idTokenPayload.email === "string" ? idTokenPayload.email : undefined,
    preferred_username: typeof idTokenPayload.preferred_username === "string" ? idTokenPayload.preferred_username : undefined,
    name: typeof localUser.name === "string" ? localUser.name : typeof idTokenPayload.name === "string" ? idTokenPayload.name : undefined,
  };

  response.cookies.set("tp_session", "1", { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge });
  response.cookies.set("tp_actorUserId", String(localUser.id), { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge });
  response.cookies.set("tp_user", base64url(Buffer.from(JSON.stringify(user), "utf8")), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge,
  });
  response.cookies.set("tp_roles", base64url(Buffer.from(JSON.stringify(roles), "utf8")), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge,
  });
  response.cookies.set("tp_id_token", tokenJson.id_token, { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge });
  if (typeof tokenJson.refresh_token === "string") {
    response.cookies.set("tp_refresh_token", tokenJson.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge,
    });
  } else {
    response.cookies.delete("tp_refresh_token", { path: "/" });
  }

  response.headers.set("Location", new URL(nextPath, request.url).toString());
  return response;
}
```

#### app/api/auth/logout/route.ts (logout + optional Keycloak backchannel)

```ts
import { NextResponse, type NextRequest } from "next/server";

function methodNotAllowed(method: string) {
  return Response.json(
    { error: `Method ${method} not allowed` },
    { status: 405, headers: { Allow: "POST, DELETE" } },
  );
}

function prefersJson(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined;
  return value.trim().replaceAll(/^`|`$/g, "").replaceAll(/^"|"$/g, "").replaceAll(/^'|'$/g, "");
}

function normalizeUrl(value: string | undefined) {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return undefined;
  return normalized.replace(/\/+$/g, "");
}

function getIssuer() {
  return (
    normalizeUrl(process.env["KEYCLOAK_ISSUER"]) ??
    (() => {
      const baseUrl =
        normalizeUrl(process.env["KEYCLOAK_BASE_URL"]) ?? normalizeUrl(process.env["NEXT_PUBLIC_KEYCLOAK_BASE_URL"]);
      const realm =
        normalizeEnvValue(process.env["KEYCLOAK_REALM"]) ?? normalizeEnvValue(process.env["NEXT_PUBLIC_KEYCLOAK_REALM"]);
      if (!baseUrl || !realm) return undefined;
      return `${baseUrl}/realms/${realm}`;
    })()
  );
}

function getKeycloakLogoutUrl(request: NextRequest) {
  const issuer = getIssuer();
  const clientId = normalizeEnvValue(process.env["KEYCLOAK_CLIENT_ID"]);
  if (!issuer || !clientId) return null;

  const origin = request.nextUrl.origin;
  const idTokenHint = request.cookies.get("tp_id_token")?.value;
  const logoutEndpoint = `${issuer.replace(/\/+$/g, "")}/protocol/openid-connect/logout`;
  const params = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri:
      normalizeEnvValue(process.env["KEYCLOAK_POST_LOGOUT_REDIRECT"]) ??
      normalizeEnvValue(process.env["POST_LOGOUT_REDIRECT"]) ??
      normalizeEnvValue(process.env["NEXT_PUBLIC_POST_LOGOUT_REDIRECT"]) ??
      `${origin}/`,
  });
  if (idTokenHint) params.set("id_token_hint", idTokenHint);
  return `${logoutEndpoint}?${params.toString()}`;
}

function shouldLogoutFromKeycloak(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider");
  if (provider === "app") return false;
  if (provider === "keycloak") return true;
  return Boolean(getIssuer() && normalizeEnvValue(process.env["KEYCLOAK_CLIENT_ID"]));
}

async function backchannelKeycloakLogout(request: NextRequest) {
  const issuer = getIssuer();
  const clientId = normalizeEnvValue(process.env["KEYCLOAK_CLIENT_ID"]);
  if (!issuer || !clientId) return { ok: false as const, reason: "not_configured" as const };

  const refreshToken = request.cookies.get("tp_refresh_token")?.value;
  if (!refreshToken) return { ok: false as const, reason: "no_refresh_token" as const };

  const logoutEndpoint = `${issuer.replace(/\/+$/g, "")}/protocol/openid-connect/logout`;
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
  });
  const clientSecret = process.env["KEYCLOAK_CLIENT_SECRET"];
  if (clientSecret) body.set("client_secret", clientSecret);

  const res = await fetch(logoutEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  return res.ok ? { ok: true as const } : { ok: false as const, reason: "failed" as const };
}

async function buildSignedOutResponse(request: NextRequest) {
  const wantsJson = prefersJson(request);
  const shouldKeycloak = shouldLogoutFromKeycloak(request);
  const backchannel = shouldKeycloak ? await backchannelKeycloakLogout(request) : null;
  const keycloakLogoutUrl = backchannel && !backchannel.ok ? getKeycloakLogoutUrl(request) : null;

  const response = wantsJson
    ? NextResponse.json({ ok: true, keycloak: { backchannelOk: backchannel?.ok ?? false, logoutUrl: keycloakLogoutUrl } })
    : NextResponse.redirect(new URL("/", request.url));

  const cookieNames = [
    "tp_session",
    "tp_actorUserId",
    "tp_user",
    "tp_roles",
    "tp_id_token",
    "tp_refresh_token",
    "tp_oidc_state",
    "tp_oidc_nonce",
    "tp_pkce_verifier",
    "tp_login_next",
  ];

  for (const name of cookieNames) {
    response.cookies.delete(name, { path: "/" });
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }

  response.headers.set("Cache-Control", "no-store");
  if (!wantsJson && keycloakLogoutUrl) response.headers.set("X-Keycloak-Logout-Url", keycloakLogoutUrl);

  return response;
}

export async function POST(request: NextRequest) {
  return await buildSignedOutResponse(request);
}

export async function GET() {
  return methodNotAllowed("GET");
}

export async function PUT() {
  return methodNotAllowed("PUT");
}

export async function PATCH() {
  return methodNotAllowed("PATCH");
}

export async function DELETE(request: NextRequest) {
  return await buildSignedOutResponse(request);
}
```

#### app/auth/form/login/page.tsx (error relay to /login)

```ts
import { redirect } from "next/navigation";

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthFormLoginPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp: SearchParams = searchParams ? await searchParams : {};
  const error = firstParam(sp.error);
  const next = firstParam(sp.next);

  const url = new URL("/login", "http://localhost");
  if (error) url.searchParams.set("error", error);
  if (next) url.searchParams.set("next", next);

  redirect(url.pathname + url.search);
}
```

#### components/LoginErrorPopup.tsx

```tsx
"use client";

import { useEffect, useState } from "react";

export default function LoginErrorPopup(props: { message: string }) {
  const { message } = props;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [message]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 top-16 z-50 mx-auto max-w-xl px-4">
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm">{message}</div>
          <button
            type="button"
            className="shrink-0 px-2 py-1 rounded border border-black/10 dark:border-white/10 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### app/login/page.tsx (auto-login unless error, then popup)

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getSession } from "@/lib/auth";
import LoginErrorPopup from "@/components/LoginErrorPopup";

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function LoginPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <LoginPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginPageContent({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await connection();
  const sp: SearchParams = searchParams ? await searchParams : {};
  const next = firstParam(sp.next) ?? "/protected";
  const error = firstParam(sp.error);
  const keycloakConfigured = Boolean(
    process.env["KEYCLOAK_CLIENT_ID"] &&
      (process.env["KEYCLOAK_ISSUER"] || (process.env["NEXT_PUBLIC_KEYCLOAK_BASE_URL"] && process.env["NEXT_PUBLIC_KEYCLOAK_REALM"])),
  );
  const { authenticated } = await getSession();

  if (authenticated && error !== "forbidden") {
    redirect(next);
  }

  if (keycloakConfigured && !error) {
    redirect(`/api/auth/login?next=${encodeURIComponent(next)}`);
  }

  const errorMessage =
    error === "forbidden"
      ? "Your account does not have access to the requested page."
      : error === "MYDIGITALID_PROFILE_INVALID"
        ? "Sign-in failed: NRIC claim missing from the identity provider profile."
        : error === "MYDIGITALID_USER_NOT_REGISTERED"
          ? "Your NRIC is not registered in this application."
          : error
            ? `Sign-in error: ${error}`
            : null;

  return (
    <div className="space-y-6 max-w-xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Login</h1>
        <p className="text-black/70 dark:text-white/70">Sign in with your Keycloak account.</p>
      </header>

      {errorMessage ? <LoginErrorPopup message={errorMessage} /> : null}

      {keycloakConfigured ? (
        <Link
          href={`/api/auth/login?next=${encodeURIComponent(next)}`}
          className="inline-flex px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
        >
          Continue with Keycloak
        </Link>
      ) : (
        <div className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 text-sm text-black/70 dark:text-white/70">
          Keycloak is not configured. Set KEYCLOAK_ISSUER and KEYCLOAK_CLIENT_ID.
        </div>
      )}

      <div className="text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
```

#### components/AppTopbar.tsx (login/logout + notifications)

```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SessionUser = {
  email?: string;
  preferred_username?: string;
  name?: string;
};

export default function AppTopbar(props: {
  authenticated: boolean;
  user?: SessionUser;
  roles: string[];
}) {
  const { authenticated, user, roles } = props;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const displayName = user?.name ?? user?.preferred_username ?? user?.email ?? "Account";

  const notifications = useMemo(
    () => [
      { id: "welcome", title: "Welcome", body: authenticated ? "You’re signed in." : "Sign in to access the dashboard." },
      { id: "rbac", title: "Access", body: roles.length ? `Roles: ${roles.join(", ")}` : "No roles found on your session." },
    ],
    [authenticated, roles],
  );

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/50 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-tight">
            Trainer Portal
          </Link>
          {authenticated ? (
            <nav className="hidden sm:flex items-center gap-3 text-sm">
              <Link href="/dashboard" className="text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white">
                Dashboard
              </Link>
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              Notifications
            </button>

            {open ? (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg overflow-hidden">
                <div className="px-3 py-2 text-xs text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10">
                  {authenticated ? displayName : "Guest"}
                </div>
                <ul className="max-h-80 overflow-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="px-3 py-2 border-b border-black/10 dark:border-white/10 last:border-b-0">
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-sm text-black/70 dark:text-white/70">{n.body}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {authenticated ? (
            <>
              <div className="hidden sm:block text-sm text-black/70 dark:text-white/70">{displayName}</div>
              <form method="post" action="/api/auth/logout?provider=keycloak">
                <button type="submit" className="px-3 py-1.5 rounded bg-black text-white dark:bg-white dark:text-black text-sm">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link href="/api/auth/login?next=%2Fdashboard" className="px-3 py-1.5 rounded bg-black text-white dark:bg-white dark:text-black text-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
```

#### components/DashboardSidebar.tsx (role-aware menu)

```tsx
import Link from "next/link";

function hasAnyRole(userRoles: string[], requiredAnyOf: string[]) {
  if (requiredAnyOf.length === 0) return true;
  const set = new Set(userRoles);
  return requiredAnyOf.some((r) => set.has(r));
}

export default function DashboardSidebar(props: { roles: string[] }) {
  const { roles } = props;

  const items: Array<{ href: string; label: string; roles?: string[] }> = [
    { href: "/dashboard", label: "Overview", roles: ["admin", "trainer", "editor", "auditor"] },
    { href: "/dashboard/posts", label: "Posts", roles: ["admin", "editor"] },
    { href: "/posts", label: "All Posts", roles: ["admin", "editor"] },
    { href: "/categories", label: "Categories", roles: ["admin", "editor"] },
    { href: "/users", label: "Users", roles: ["admin"] },
    { href: "/audit-logs", label: "Audit Logs", roles: ["admin", "auditor"] },
  ];

  const visible = items.filter((i) => hasAnyRole(roles, i.roles ?? []));

  return (
    <aside className="w-64 shrink-0 border-r border-black/10 dark:border-white/10 bg-white dark:bg-black">
      <div className="p-4">
        <div className="text-xs text-black/60 dark:text-white/60">Menu</div>
        <nav className="mt-3 flex flex-col gap-1">
          {visible.map((item) => (
            <Link key={item.href} href={item.href} className="px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10 text-sm">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
```

#### app/layout.tsx (loads session + renders topbar)

```tsx
import { Suspense } from "react";
import { connection } from "next/server";

import AppTopbar from "@/components/AppTopbar";
import { getSession } from "@/lib/auth";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans bg-white dark:bg-black text-black dark:text-white">
        <Suspense fallback={<div className="h-14 border-b border-black/10 dark:border-white/10" />}>
          <Topbar />
        </Suspense>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

async function Topbar() {
  await connection();
  const { authenticated, user, roles } = await getSession();
  return <AppTopbar authenticated={authenticated} user={user} roles={roles} />;
}
```

#### app/page.tsx (landing)

```tsx
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { getSession } from "@/lib/auth";

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function HomePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <HomePageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomePageContent({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await connection();
  const { authenticated, user, roles } = await getSession();
  const sp: SearchParams = searchParams ? await searchParams : {};
  const error = firstParam(sp.error);

  return (
    <div className="space-y-10">
      {error === "forbidden" ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          Your account is signed in but does not have access to that page.
        </div>
      ) : null}

      <section className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Trainer Portal</h1>
        <p className="text-black/70 dark:text-white/70 max-w-2xl">
          Single Sign-On with Keycloak + role-based access control, with an authenticated dashboard experience.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {authenticated ? (
            <Link href="/dashboard" className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black">
              Go to dashboard
            </Link>
          ) : (
            <Link href="/api/auth/login?next=%2Fdashboard" className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black">
              Login with Keycloak
            </Link>
          )}
          <Link
            href="/advanced"
            className="px-4 py-2 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
          >
            View demos
          </Link>
        </div>
      </section>

      {authenticated ? (
        <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 space-y-2">
          <div className="text-sm text-black/60 dark:text-white/60">Signed in</div>
          <div className="text-lg font-semibold">{user?.name ?? user?.preferred_username ?? user?.email ?? "Account"}</div>
          <div className="text-sm text-black/70 dark:text-white/70">{roles.length ? roles.join(", ") : "No roles"}</div>
        </section>
      ) : (
        <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 space-y-2">
          <div className="text-sm text-black/60 dark:text-white/60">Get started</div>
          <div className="text-black/70 dark:text-white/70">Sign in with Keycloak to access the dashboard and role-based navigation.</div>
          <div className="text-sm text-black/60 dark:text-white/60">Configure KEYCLOAK_ISSUER and KEYCLOAK_CLIENT_ID in your environment.</div>
        </section>
      )}
    </div>
  );
}
```

#### app/dashboard/layout.tsx

```tsx
import { Suspense } from "react";
import { connection } from "next/server";

import DashboardSidebar from "@/components/DashboardSidebar";
import { getSession } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

async function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  await connection();
  const { roles } = await getSession();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
      <DashboardSidebar roles={roles} />
      <div className="flex-1 p-6 bg-black/[0.02] dark:bg-white/[0.03]">{children}</div>
    </div>
  );
}
```

#### app/dashboard/page.tsx

```tsx
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { getTrainersPage } from "@/lib/data";
import { getSession, hasAnyRole } from "@/lib/auth";

type SearchParams = { [key: string]: string | string[] | undefined };

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseBoundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function buildHref(pathname: string, page: number, pageSize: number) {
  return `${pathname}?page=${page}&pageSize=${pageSize}`;
}

export default function DashboardPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <DashboardPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardPageContent({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await connection();
  const { user, roles } = await getSession();

  const sp: SearchParams = searchParams ? await searchParams : {};
  const requestedPage = parseBoundedInt(firstParam(sp.page), 1, 1, 1_000_000);
  const pageSize = parseBoundedInt(firstParam(sp.pageSize), 10, 1, 50);

  const { data: trainers, meta } = await getTrainersPage({ page: requestedPage, pageSize });
  const { page, total, totalPages } = meta;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-black/70 dark:text-white/70">
          {user?.name ?? user?.preferred_username ?? user?.email ?? "Signed in"} · {roles.length ? roles.join(", ") : "No roles"}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {hasAnyRole(roles, ["admin", "editor"]) ? (
          <Link
            href="/dashboard/posts"
            className="rounded-xl border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="text-sm text-black/60 dark:text-white/60">Manage</div>
            <div className="text-lg font-semibold">Posts</div>
            <div className="text-sm text-black/70 dark:text-white/70">Create and review posts</div>
          </Link>
        ) : null}

        {hasAnyRole(roles, ["admin"]) ? (
          <Link href="/users" className="rounded-xl border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/10">
            <div className="text-sm text-black/60 dark:text-white/60">Admin</div>
            <div className="text-lg font-semibold">Users</div>
            <div className="text-sm text-black/70 dark:text-white/70">Manage accounts and roles</div>
          </Link>
        ) : null}

        {hasAnyRole(roles, ["admin", "auditor"]) ? (
          <Link
            href="/audit-logs"
            className="rounded-xl border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="text-sm text-black/60 dark:text-white/60">Review</div>
            <div className="text-lg font-semibold">Audit logs</div>
            <div className="text-sm text-black/70 dark:text-white/70">Track system activity</div>
          </Link>
        ) : null}
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/10">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainers.length === 0 ? (
                <tr className="border-t border-black/10 dark:border-white/10">
                  <td className="px-4 py-3 text-black/70 dark:text-white/70" colSpan={6}>
                    No trainers found.
                  </td>
                </tr>
              ) : (
                trainers.map((trainer) => (
                  <tr key={trainer.id} className="border-t border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">
                    <td className="px-4 py-3 font-medium">{trainer.name ?? "—"}</td>
                    <td className="px-4 py-3">{trainer.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs font-medium">
                        {trainer.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(trainer.createdAt)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(trainer.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/users/${trainer.id}/edit`} className="text-blue-600 hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="text-black/70 dark:text-white/70">
          Page {page} of {totalPages} · {total} total
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={buildHref("/dashboard", page - 1, pageSize)}
              className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Previous
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40">
              Previous
            </span>
          )}
          {page < totalPages ? (
            <Link
              href={buildHref("/dashboard", page + 1, pageSize)}
              className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Next
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### app/actions.ts (RBAC on mutations)

```ts
'use server'

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function getInt(formData: FormData, key: string) {
  const raw = getString(formData, key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function getBool(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

const categorySchema = z.object({
  name: z.string().min(1),
});

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  published: z.boolean(),
  categoryId: z.number().int().positive(),
  authorId: z.number().int().positive(),
});

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["USER", "TRAINER", "ADMIN"]),
  bio: z.string().optional(),
});

export async function createCategory(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const parsed = categorySchema.safeParse({
    name: getString(formData, "name"),
  });
  if (!parsed.success) {
    throw new Error("Invalid category data");
  }

  await prisma.$transaction(async (tx) => {
    const category = await tx.category.create({ data: { name: parsed.data.name }, select: { id: true, name: true } });
    await tx.auditLog.create({
      data: { action: "CREATE", entityType: "CATEGORY", entityId: category.id, metadata: { name: category.name } },
    });
  });
  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategory(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid category id");
  }

  const parsed = categorySchema.safeParse({
    name: getString(formData, "name"),
  });
  if (!parsed.success) {
    throw new Error("Invalid category data");
  }

  await prisma.$transaction(async (tx) => {
    const category = await tx.category.update({
      where: { id },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });
    await tx.auditLog.create({
      data: { action: "UPDATE", entityType: "CATEGORY", entityId: category.id, metadata: { name: category.name } },
    });
  });
  revalidatePath("/categories");
  revalidatePath(`/categories/${id}`);
  redirect(`/categories/${id}`);
}

export async function deleteCategory(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid category id");
  }

  await prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { id }, select: { id: true, name: true } });
    await tx.category.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entityType: "CATEGORY",
        entityId: id,
        metadata: category ? { name: category.name } : undefined,
      },
    });
  });
  revalidatePath("/categories");
  redirect("/categories");
}

export async function createPost(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const parsed = postSchema.safeParse({
    title: getString(formData, "title"),
    content: getOptionalString(formData, "content"),
    published: getBool(formData, "published"),
    categoryId: getInt(formData, "categoryId"),
    authorId: getInt(formData, "authorId"),
  });
  if (!parsed.success) {
    throw new Error("Invalid post data");
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        published: parsed.data.published,
        categoryId: parsed.data.categoryId,
        authorId: parsed.data.authorId,
      },
      select: { id: true, title: true, published: true, categoryId: true, authorId: true },
    });

    await tx.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "POST",
        entityId: created.id,
        metadata: {
          title: created.title,
          published: created.published,
          categoryId: created.categoryId,
          authorId: created.authorId,
        },
      },
    });

    return created;
  });

  revalidatePath("/posts");
  redirect(`/posts/${post.id}`);
}

export async function updatePost(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid post id");
  }

  const parsed = postSchema.safeParse({
    title: getString(formData, "title"),
    content: getOptionalString(formData, "content"),
    published: getBool(formData, "published"),
    categoryId: getInt(formData, "categoryId"),
    authorId: getInt(formData, "authorId"),
  });
  if (!parsed.success) {
    throw new Error("Invalid post data");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.post.update({
      where: { id },
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        published: parsed.data.published,
        categoryId: parsed.data.categoryId,
        authorId: parsed.data.authorId,
      },
      select: { id: true, title: true, published: true, categoryId: true, authorId: true },
    });

    await tx.auditLog.create({
      data: {
        action: "UPDATE",
        entityType: "POST",
        entityId: updated.id,
        metadata: {
          title: updated.title,
          published: updated.published,
          categoryId: updated.categoryId,
          authorId: updated.authorId,
        },
      },
    });
  });

  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  redirect(`/posts/${id}`);
}

export async function deletePost(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid post id");
  }

  await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({ where: { id }, select: { id: true, title: true } });
    await tx.post.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entityType: "POST",
        entityId: id,
        metadata: post ? { title: post.title } : undefined,
      },
    });
  });
  revalidatePath("/posts");
  redirect("/posts");
}

export async function createUser(formData: FormData) {
  await requireAnyRole(["admin"]);
  const parsed = userSchema.safeParse({
    email: getString(formData, "email"),
    name: getOptionalString(formData, "name"),
    role: getString(formData, "role"),
    bio: getOptionalString(formData, "bio"),
  });
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        profile: parsed.data.bio ? { create: { bio: parsed.data.bio } } : undefined,
      },
      select: { id: true, email: true, role: true },
    });

    await tx.auditLog.create({
      data: { action: "CREATE", entityType: "USER", entityId: created.id, metadata: { email: created.email, role: created.role } },
    });

    return created;
  });

  revalidatePath("/users");
  redirect(`/users/${user.id}/edit`);
}

export async function updateUser(formData: FormData) {
  await requireAnyRole(["admin"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid user id");
  }

  const parsed = userSchema.safeParse({
    email: getString(formData, "email"),
    name: getOptionalString(formData, "name"),
    role: getString(formData, "role"),
    bio: getOptionalString(formData, "bio"),
  });
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        profile: parsed.data.bio ? { upsert: { create: { bio: parsed.data.bio }, update: { bio: parsed.data.bio } } } : undefined,
      },
      select: { id: true, email: true, role: true },
    });

    if (!parsed.data.bio) {
      await tx.profile.deleteMany({ where: { userId: id } });
    }

    await tx.auditLog.create({
      data: { action: "UPDATE", entityType: "USER", entityId: updated.id, metadata: { email: updated.email, role: updated.role } },
    });
  });

  revalidatePath("/users");
  redirect(`/users/${id}/edit`);
}

export async function deleteUser(formData: FormData) {
  await requireAnyRole(["admin"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid user id");
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
    await tx.user.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entityType: "USER",
        entityId: id,
        metadata: user ? { email: user.email, role: user.role } : undefined,
      },
    });
  });
  revalidatePath("/users");
  redirect("/users");
}
```

#### app/dashboard/posts/actions.ts (RBAC on dashboard mutation)

```ts
"use server";

import { prisma } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const formSchema = z.object({
  title: z.string().min(3),
});

export async function createPostAction(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const title = formData.get("title");

  const parsed = formSchema.safeParse({ title });
  if (!parsed.success) {
    throw new Error("Invalid form data");
  }

  await prisma.post.create({
    data: {
      title: parsed.data.title,
      authorId: 1,
      categoryId: 1,
    },
  });

  revalidatePath("/dashboard/posts");
}
```

### 1) Start login: `/api/auth/login`

File: [app/api/auth/login/route.ts](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/app/api/auth/login/route.ts)

Key section (auth redirect request params):

```ts
scope: "openid profile",
prompt: "login",
state,
nonce,
code_challenge,
code_challenge_method: "S256",
```

### 2) Callback + verification + sign-in gate: `/api/auth/callback/keycloak`

File: [app/api/auth/callback/keycloak/route.ts](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/app/api/auth/callback/keycloak/route.ts)

Key pieces:
- Token exchange (`/token`)
- Verify JWT signature with JWKS (`/certs`)
- Validate claims: `iss`, `aud`, `exp`, `nonce`
- Read `nric` from id token
- `prisma.user.findUnique({ where: { nric } })`
- If not found: backchannel logout (`POST /logout` with refresh_token), then redirect with an error code
- If found: set cookies:
  - `tp_session`
  - `tp_actorUserId` (local user id)
  - `tp_user` (base64url JSON)
  - `tp_roles` (derived from local DB `User.role`)
  - `tp_id_token` + `tp_refresh_token` (for logout)

### 3) Login page + “popup error” (prevents login loop)

File: [app/login/page.tsx](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/app/login/page.tsx)

Behavior:
- If Keycloak is configured and no `?error=...` → auto-redirect into Keycloak login
- If `?error=MYDIGITALID_USER_NOT_REGISTERED` → show a popup, do not auto-redirect

Popup component:
- [components/LoginErrorPopup.tsx](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/components/LoginErrorPopup.tsx)

### 4) Error redirect compatibility route: `/auth/form/login`

This matches the “post_logout_redirect_uri” / “blocked login redirect” patterns from the reference app.

File: [app/auth/form/login/page.tsx](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/app/auth/form/login/page.tsx)

It forwards `error` and `next` query params to `/login`.

### 5) Logout API (app cookies + Keycloak backchannel)

File: [app/api/auth/logout/route.ts](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/app/api/auth/logout/route.ts)

Supports:
- `POST /api/auth/logout?provider=keycloak`:
  - tries backchannel Keycloak logout (refresh_token) without redirect
  - clears app cookies
  - redirects to `/`
- `POST /api/auth/logout?provider=app`:
  - clears only app cookies
  - redirects to `/`
- For API clients:
  - send `Accept: application/json`
  - gets `{ ok: true, keycloak: { backchannelOk, logoutUrl } }`

Note:
- If backchannel fails, we expose a fallback URL in JSON (`logoutUrl`) or response header `X-Keycloak-Logout-Url`.

### 6) RBAC middleware (route protection)

File: [middleware.ts](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/middleware.ts)

Current role rules:
- `/users/*` → `admin`
- `/audit-logs/*` → `admin` or `auditor`
- `/posts/*`, `/categories/*`, `/dashboard/posts/*` → `admin` or `editor`
- `/dashboard/*` → `admin | trainer | editor | auditor`

### 7) Server-side session API

File: [lib/auth.ts](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/lib/auth.ts)

Important Next.js 16 detail:
- `cookies()` is async in this repo’s Next.js version, so session access is:

```ts
const store = await cookies();
```

### 8) UI shell (topbar, sidebar, notifications)

Topbar:
- [components/AppTopbar.tsx](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/components/AppTopbar.tsx)

Dashboard sidebar:
- [components/DashboardSidebar.tsx](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/components/DashboardSidebar.tsx)

Root layout loads session server-side and renders the topbar:
- [app/layout.tsx](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/app/layout.tsx)

## Troubleshooting Checklist

### “Unknown argument `nric`” in Prisma

Cause: Prisma Client not regenerated / dev server cache.

Fix:
```bash
npx prisma generate
```
Restart `npm run dev`.

### Login loops back to Keycloak after “user not registered”

Fix: ensure errors are preserved and login page does not auto-redirect when `?error=...` exists.

Files:
- [auth/form/login/page.tsx](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/app/auth/form/login/page.tsx)
- [login/page.tsx](file:///d:/User/Documents/Personal/TOT-nextjs/trainer-portal/app/login/page.tsx)

### `MYDIGITALID_PROFILE_INVALID`

Keycloak did not include `nric` in the ID token.
Add the protocol mapper described in “Keycloak Setup”.

### Backchannel logout doesn’t log out from Keycloak

Backchannel uses refresh_token. Ensure:
- Client is confidential (has secret)
- Token response includes `refresh_token`

Keycloak notes that direct invocation logout (refresh_token) is legacy; RP-initiated logout (redirect) is the standard approach. See Keycloak docs. citehttps://www.keycloak.org/nightly/securing-apps/oidc-layers
