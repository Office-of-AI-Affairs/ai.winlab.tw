import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

// Hosts that MCP clients are allowed to register as callbacks. Anything else
// (especially attacker-controlled domains) is rejected at registration time so
// the OAuth phishing path can't get off the ground. `.winlab.tw` is treated as
// a suffix match so subdomains we add later don't need a code change.
const REDIRECT_URI_HOST_ALLOWLIST = new Set([
  "localhost",
  "127.0.0.1",
  "claude.ai",
  "cursor.com",
  "mcp.ai.winlab.tw",
]);
const REDIRECT_URI_HOST_SUFFIX_ALLOWLIST = [".winlab.tw"];

function assertAllowedRedirectUri(uri: string) {
  const parsed = new URL(uri);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`redirect_uri scheme not allowed: ${parsed.protocol}`);
  }
  const host = parsed.hostname;
  if (REDIRECT_URI_HOST_ALLOWLIST.has(host)) return;
  if (REDIRECT_URI_HOST_SUFFIX_ALLOWLIST.some((suffix) => host.endsWith(suffix))) return;
  throw new Error(`redirect_uri host not allowed: ${host}`);
}

const oauthClientSchema = z.object({
  client_id: z.string(),
  client_name: z.string(),
  redirect_uris: z.array(z.string().url()).min(1),
  grant_types: z.array(z.enum(["authorization_code", "refresh_token"])).min(1),
  response_types: z.array(z.literal("code")).min(1),
  created_at: z.string().optional(),
});

const registrationRequestSchema = z.object({
  client_name: z.string().min(1).default("MCP Client"),
  redirect_uris: z
    .array(z.string().url())
    .min(1)
    .superRefine((uris, ctx) => {
      for (const uri of uris) {
        try {
          assertAllowedRedirectUri(uri);
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: error instanceof Error ? error.message : "invalid redirect_uri",
            path: [uris.indexOf(uri)],
          });
        }
      }
    }),
  grant_types: z
    .array(z.enum(["authorization_code", "refresh_token"]))
    .min(1)
    .default(["authorization_code", "refresh_token"]),
  response_types: z.array(z.literal("code")).min(1).default(["code"]),
});

export type OAuthClientRow = z.infer<typeof oauthClientSchema>;
type RegistrationRequest = z.infer<typeof registrationRequestSchema>;

export type OAuthClientStore = {
  insert: (row: OAuthClientRow) => Promise<void>;
  selectById: (clientId: string) => Promise<OAuthClientRow | null>;
};

export function createOAuthClientStore(store: OAuthClientStore) {
  return store;
}

export async function registerOAuthClient(
  input: unknown,
  store = createDatabaseOAuthClientStore(),
) {
  const registration = registrationRequestSchema.parse(input);
  const client = {
    client_id: randomUUID(),
    client_name: registration.client_name,
    redirect_uris: registration.redirect_uris,
    grant_types: registration.grant_types,
    response_types: registration.response_types,
    token_endpoint_auth_method: "none" as const,
  };

  await store.insert({
    ...client,
    created_at: new Date().toISOString(),
  });

  return client;
}

export async function getOAuthClient(
  clientId: string,
  store = createDatabaseOAuthClientStore(),
) {
  return store.selectById(clientId);
}

export async function getRedirectUriMatch(
  clientId: string,
  redirectUri: string,
  store = createDatabaseOAuthClientStore(),
) {
  const client = await getOAuthClient(clientId, store);
  if (!client) return null;
  return client.redirect_uris.includes(redirectUri) ? redirectUri : null;
}

function createDatabaseOAuthClientStore(): OAuthClientStore {
  return {
    async insert(row) {
      const supabase = createServiceClient();
      const { error } = await supabase.from("oauth_clients").insert({
        client_id: row.client_id,
        client_name: row.client_name,
        redirect_uris: row.redirect_uris,
        grant_types: row.grant_types,
        response_types: row.response_types,
      });

      if (error) {
        throw new Error(`Failed to store oauth client: ${error.message}`);
      }
    },
    async selectById(clientId) {
      // anon SELECT on oauth_clients was removed 2026-05-18 — only service-role
      // reads remain. authorize page + token exchange call into here.
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("oauth_clients")
        .select("client_id, client_name, redirect_uris, grant_types, response_types, created_at")
        .eq("client_id", clientId)
        .single();

      if (error || !data) return null;
      return oauthClientSchema.parse(data);
    },
  };
}
