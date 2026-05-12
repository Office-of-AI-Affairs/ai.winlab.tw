import { createClient } from "@supabase/supabase-js";
import { ZodError, z } from "zod";
import { createAuthCode } from "@/lib/auth/auth-codes";
import { validateOAuthClientRequest } from "@/lib/auth/oauth-request";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import { getMcpResourceUrl } from "@/lib/auth/urls";

const callbackBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  clientId: z.string().min(1),
  redirectUri: z.string().url(),
  codeChallenge: z.string().min(1),
  resource: z.string().url().optional(),
  state: z.string().optional(),
});

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

  const supabase = createClient(supabaseUrl, supabasePublishableKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data.session) {
    return Response.json(
      {
        error: "access_denied",
        error_description: error?.message || "Authentication failed",
      },
      { status: 401 },
    );
  }

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
