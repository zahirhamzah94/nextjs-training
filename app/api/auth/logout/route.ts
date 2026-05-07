import { NextResponse, type NextRequest } from "next/server";

/**
 * Demo logout endpoint.
 *
 * Flow:
 * - POST clears the demo auth cookies (`tp_session`, `tp_actorUserId`)
 * - Redirects back to `/`
 */
/**
 * Consistent 405 helper for unsupported methods.
 */
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
