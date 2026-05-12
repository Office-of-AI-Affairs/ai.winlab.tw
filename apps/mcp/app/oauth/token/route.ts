import { createClient } from "@supabase/supabase-js";
import { exchangeAuthCode } from "@/lib/auth/auth-codes";
import { verifyPkce } from "@/lib/auth/pkce";
import {
  parseTokenAuthorizationCodeRequest,
  validateOAuthClientRequest,
} from "@/lib/auth/oauth-request";
import { getMcpResourceUrl } from "@/lib/auth/urls";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export async function POST(request: Request) {
  const body = await request.formData();
  const grantType = body.get("grant_type") as string;

  if (grantType === "authorization_code") {
    return handleAuthorizationCode(body);
  } else if (grantType === "refresh_token") {
    return handleRefreshToken(body);
  }

  return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
}

async function handleAuthorizationCode(body: FormData) {
  let request: ReturnType<typeof parseTokenAuthorizationCodeRequest>;

  try {
    request = parseTokenAuthorizationCodeRequest(body);
  } catch (error) {
    return Response.json(
      {
        error: "invalid_request",
        error_description:
          error instanceof Error ? error.message : "Missing code or code_verifier",
      },
      { status: 400 }
    );
  }

  const stored = await exchangeAuthCode(request.code);
  if (!stored) {
    return Response.json(
      {
        error: "invalid_grant",
        error_description: "Invalid or expired authorization code",
      },
      { status: 400 }
    );
  }

  if (request.redirectUri !== stored.redirectUri) {
    return Response.json(
      {
        error: "invalid_grant",
        error_description: "redirect_uri mismatch",
      },
      { status: 400 }
    );
  }

  if (request.clientId !== stored.clientId) {
    return Response.json(
      {
        error: "invalid_grant",
        error_description: "client_id mismatch",
      },
      { status: 400 }
    );
  }

  if (request.resource && stored.resource && request.resource !== stored.resource) {
    return Response.json(
      {
        error: "invalid_grant",
        error_description: "resource mismatch",
      },
      { status: 400 }
    );
  }

  try {
    await validateOAuthClientRequest(
      {
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        resource: request.resource,
      },
      {
        expectedResource: getMcpResourceUrl(),
      },
    );
  } catch (error) {
    return Response.json(
      {
        error: "invalid_grant",
        error_description: error instanceof Error ? error.message : "Client validation failed",
      },
      { status: 400 }
    );
  }

  if (!verifyPkce(request.codeVerifier, stored.codeChallenge)) {
    return Response.json(
      {
        error: "invalid_grant",
        error_description: "PKCE verification failed",
      },
      { status: 400 }
    );
  }

  return Response.json({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    token_type: "Bearer",
    expires_in: stored.expiresIn,
  });
}

async function handleRefreshToken(body: FormData) {
  const refreshToken = body.get("refresh_token") as string;

  if (!refreshToken) {
    return Response.json(
      {
        error: "invalid_request",
        error_description: "Missing refresh_token",
      },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey);
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return Response.json(
      {
        error: "invalid_grant",
        error_description: error?.message || "Invalid or expired refresh token",
      },
      { status: 400 }
    );
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    token_type: "Bearer",
    expires_in: data.session.expires_in,
  });
}
