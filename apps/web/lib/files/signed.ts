import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Time-limited links to private files (resumes), for MCP clients that have
// no session cookie. The same idea as Supabase's signed URLs.

const secret = () => {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error("BETTER_AUTH_SECRET is not set");
  return value;
};

const signature = (path: string, expires: number) =>
  createHmac("sha256", secret()).update(`resumes/${path}\n${expires}`).digest("base64url");

/** An absolute link to a resume, valid for `ttlSeconds`. */
export function signedResumeUrl(path: string, ttlSeconds = 3600): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const base = process.env.BETTER_AUTH_URL ?? "https://ai.winlab.tw";
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/files/resumes/${encoded}?expires=${expires}&sig=${signature(path, expires)}`;
}

export function verifyResumeSignature(path: string, expires: string | null, sig: string | null): boolean {
  const at = Number(expires);
  if (!sig || !Number.isInteger(at) || at < Date.now() / 1000) return false;
  const expected = Buffer.from(signature(path, at));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
