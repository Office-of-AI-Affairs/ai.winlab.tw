import { createClient } from "@supabase/supabase-js";
import { ZodError, z } from "zod";
import { createAuthCode } from "@/lib/auth/auth-codes";
import { validateOAuthClientRequest } from "@/lib/auth/oauth-request";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import { getMcpResourceUrl } from "@/lib/auth/urls";
import { createRateLimiter, getClientIp, normalizeEmail } from "@/lib/auth/rate-limit";
import { emitOtelLog } from "@/lib/otel/log";

const callbackBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  clientId: z.string().min(1),
  redirectUri: z.string().url(),
  codeChallenge: z.string().min(1),
  resource: z.string().url().optional(),
  state: z.string().optional(),
});

// Best-effort in-memory brute-force / credential-stuffing throttle. See
// lib/auth/rate-limit.ts for the multi-instance caveat — this is a first
// line of defense, not a strong guarantee.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_FAILURES = 10;
const EMAIL_MAX_FAILURES = 5;

const ipRateLimiter = createRateLimiter(RATE_LIMIT_WINDOW_MS, IP_MAX_FAILURES);
const emailRateLimiter = createRateLimiter(RATE_LIMIT_WINDOW_MS, EMAIL_MAX_FAILURES);

function tooManyRequestsResponse(retryAfterSeconds: number) {
  return Response.json(
    {
      error: "too_many_requests",
      error_description: "Too many failed login attempts. Please try again later.",
    },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) },
    },
  );
}

export async function POST(request: Request) {
  let body: z.infer<typeof callbackBodySchema>;

  try {
    body = callbackBodySchema.parse(await request.json());
    await validateOAuthClientRequest(
      {
        clientId: body.clientId,
        redirectUri: body.redirectUri,
        resource: body.resource,
      },
      {
        expectedResource: getMcpResourceUrl(),
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: "invalid_request",
          error_description: error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 },
      );
    }

    return Response.json(
      {
        error: "invalid_request",
        error_description: error instanceof Error ? error.message : "Invalid authorization request",
      },
      { status: 400 },
    );
  }

  const clientIp = getClientIp(request);
  const normalizedEmail = normalizeEmail(body.email);

  if (ipRateLimiter.isLimited(clientIp) || emailRateLimiter.isLimited(normalizedEmail)) {
    const retryAfterSeconds = Math.max(
      ipRateLimiter.retryAfterSeconds(clientIp),
      emailRateLimiter.retryAfterSeconds(normalizedEmail),
    );

    // Attack-visibility signal: someone is hammering login. `ip`/`email` are
    // the rate-limit dimensions, not secrets — never log `body.password`.
    emitOtelLog({
      severity: "WARN",
      message: "oauth/callback rate limited",
      attributes: {
        reason: "rate_limited",
        ip: clientIp,
        email: normalizedEmail,
      },
    });

    return tooManyRequestsResponse(retryAfterSeconds);
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data.session) {
    ipRateLimiter.recordFailure(clientIp);
    emailRateLimiter.recordFailure(normalizedEmail);

    // Attack-visibility signal: failed credential attempt. Only the email
    // and client IP are logged — never `body.password` or the Supabase
    // session/token data.
    emitOtelLog({
      severity: "WARN",
      message: "oauth/callback auth failed",
      attributes: {
        reason: "auth_failed",
        ip: clientIp,
        email: normalizedEmail,
      },
    });

    return Response.json(
      {
        error: "access_denied",
        error_description: error?.message || "Authentication failed",
      },
      { status: 401 },
    );
  }

  emailRateLimiter.reset(normalizedEmail);

  const code = await createAuthCode({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    codeChallenge: body.codeChallenge,
    redirectUri: body.redirectUri,
    clientId: body.clientId,
    resource: body.resource,
  });

  const redirect = new URL(body.redirectUri);
  redirect.searchParams.set("code", code);
  if (body.state) redirect.searchParams.set("state", body.state);

  return Response.json({ redirectUrl: redirect.toString() });
}
