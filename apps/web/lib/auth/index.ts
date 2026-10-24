import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, jwt } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { recoveryMail } from "@/lib/auth/recovery-mail";
import { sendMail } from "@/lib/mail";

// Required at run time. next build imports this module to collect routes,
// so only that phase gets a placeholder.
const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.NEXT_PHASE === "phase-production-build" ? "http://localhost:3000" : undefined);
if (!baseURL) throw new Error("BETTER_AUTH_URL is not set");

/** The MCP endpoint, as clients request it and tokens carry it in aud. */
export const mcpResource = new URL("/mcp", baseURL).toString();

// Email and password only. Accounts are made by admins (no public sign-up,
// as on Supabase), and a forgotten password is reset with an 8-digit code
// mailed to the account, valid for one hour. The site is also the OAuth 2.1
// authorization server for MCP clients (same setup as NYCU-WinLab/portal).
export const auth = betterAuth({
  baseURL,
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NEXT_PHASE === "phase-production-build" ? "build-time-placeholder-not-a-secret" : undefined),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // A function, not "uuid": the adapter would otherwise replace ids that
  // Better Auth sets on purpose.
  advanced: { database: { generateId: () => crypto.randomUUID() } },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 6,
    password: { hash: hashPassword, verify: verifyPassword },
    revokeSessionsOnPasswordReset: true,
  },
  // Name and email belong to the profile and to admins. Of the email-code
  // endpoints only the password reset pair stays open: no code sign-in.
  disabledPaths: [
    "/update-user",
    "/change-email",
    "/sign-in/email-otp",
    "/email-otp/verify-email",
    "/email-otp/send-verification-otp",
    "/forget-password/email-otp",
  ],
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  plugins: [
    emailOTP({
      otpLength: 8,
      expiresIn: 60 * 60,
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "forget-password") return;
        await sendMail({ to: email, ...recoveryMail(otp) });
      },
    }),
    jwt(),
    mcp({
      resource: mcpResource,
      loginPage: "/login",
      consentPage: "/oauth/consent",
      scopes: ["openid", "profile", "email", "offline_access"],
      // CIMD is the 2026-07-28 way; DCR stays for clients that predate it.
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
