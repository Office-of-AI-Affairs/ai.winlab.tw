// TEMPORARY diagnostic buffer for #81. Delete once the root cause is known.
//
// Every page under /events/[slug] renders the error boundary on
// ai.winlab.tw with digest 3061540916, and no local configuration
// reproduces it. Production builds strip the message before it reaches the
// client, preview deployments and per-deployment URLs are behind Vercel
// SSO, so the deployed function is the only place the real error exists.
//
// `onRequestError` already receives that error, but it runs inside the page
// function and the diagnostic route is a separate Lambda on Vercel, so
// module scope cannot bridge them (verified: the buffer read back empty
// every time). The hook posts the error across to that route, which keeps
// the last few in its own module scope for reading back.

export type CapturedError = {
  at: string;
  routePath: string;
  routeType: string;
  renderSource: string | null;
  path: string;
  name: string;
  message: string;
  digest: string | null;
  stack: string[];
  causeMessage: string | null;
};

const MAX_ENTRIES = 8;

// Same throwaway token as the route; see that file.
const DIAG_TOKEN = "5efbbfda140bd8eee3d6be642eb6f351";
const DIAG_ENDPOINT = "https://ai.winlab.tw/api/diag/rsc-error";

// Module scope is per-instance and resets on cold start; globalThis keeps it
// alive across the module-graph duplication Next can introduce.
const slot = globalThis as typeof globalThis & { __winlabDiagErrors?: CapturedError[] };

export function captureDiagError(entry: CapturedError): void {
  const list = (slot.__winlabDiagErrors ??= []);
  list.push(entry);
  if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES);
}

export function readDiagErrors(): CapturedError[] {
  return slot.__winlabDiagErrors ?? [];
}

/** Ship an error from the page function to the diagnostic route's instance. */
export async function postDiagError(entry: CapturedError): Promise<void> {
  try {
    await fetch(DIAG_ENDPOINT + "?token=" + DIAG_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
      cache: "no-store",
    });
  } catch {
    // Diagnostics must never make the failure worse.
  }
}
