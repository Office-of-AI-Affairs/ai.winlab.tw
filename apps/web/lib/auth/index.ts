import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
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

// Email and password only. Accounts are made by admins (no public sign-up,
// as on Supabase), and a forgotten password is reset with an 8-digit code
// mailed to the account, valid for one hour.
export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
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
  // Name and email belong to the profile and to admins.
  disabledPaths: ["/update-user", "/change-email"],
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
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
