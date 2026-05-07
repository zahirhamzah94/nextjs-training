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
  if (resourceAccess && typeof resourceAccess === "object") {
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
