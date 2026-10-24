// Browser calls to Better Auth (/api/auth/*). Plain fetch: the auth client
// package would add its weight to every page for 4 endpoints.
export type AuthResult = { ok: true } | { ok: false; status: number; code?: string };

export async function authPost(path: string, body: Record<string, unknown> = {}): Promise<AuthResult> {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  if (res.ok) return { ok: true };
  const data = (await res.json().catch(() => null)) as { code?: string } | null;
  return { ok: false, status: res.status, code: data?.code };
}
