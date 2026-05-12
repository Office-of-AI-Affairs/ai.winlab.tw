import { createRemoteJWKSet, jwtVerify } from "jose";

import { supabaseUrl } from "@/lib/supabase/config";

export interface McpTokenClaims {
  sub: string;
  email?: string;
  role: string;
  aud: string;
  iss: string;
  iat: number;
  exp: number;
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!cachedJwks) {
    cachedJwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
    );
  }
  return cachedJwks;
}

export async function verifyMcpToken(
  token: string
): Promise<McpTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: "authenticated",
    });

    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;

    return payload as unknown as McpTokenClaims;
  } catch {
    return null;
  }
}
