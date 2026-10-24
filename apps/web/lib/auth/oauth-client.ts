"use client";

import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";

// Only the login and consent pages load this. oauthProviderClient forwards
// the signed query of an MCP authorization through sign-in and consent, so
// the authorization resumes by itself.
export const oauthAuthClient = createAuthClient({ plugins: [oauthProviderClient()] });
