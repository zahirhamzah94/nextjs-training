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

/**
 * Demo login endpoint.
 *
 * Request:
 * - POST form data:
 *   - `next`: optional path to redirect to after login (must start with "/")
 *   - `userId`: optional numeric user id to store as the "actor" for audit logging demos
 *
 * Response:
 * - 302 redirect to `next` (or `/protected` by default)
 * - Sets cookies:
 *   - `tp_session=1` (minimal "logged in" marker for middleware protection)
 *   - `tp_actorUserId=<id>` when provided (used by UI/API flows that attribute audit logs)
 *
 * Notes:
 * - This is intentionally not real authentication (no password check, no expiration).
 */
/**
 * Consistent 405 helper for unsupported methods.
 */
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
