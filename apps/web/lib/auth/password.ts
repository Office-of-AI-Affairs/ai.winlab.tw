import bcrypt from "bcryptjs";
import { hashPassword as scryptHash, verifyPassword as scryptVerify } from "better-auth/crypto";

// Accounts imported from Supabase keep their bcrypt hash ($2a$...), so
// people sign in with the password they already have. New and changed
// passwords use Better Auth's scrypt.
export const hashPassword = (password: string) => scryptHash(password);

export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  if (/^\$2[aby]\$/.test(hash)) return bcrypt.compare(password, hash);
  return scryptVerify({ hash, password });
}
