// TEMPORARY diagnostic buffer for #81. Delete once the root cause is known.
//
// Every page under /events/[slug] renders the error boundary on
// ai.winlab.tw with digest 3061540916, and no local configuration
// reproduces it. Production builds strip the message before it reaches the
// client, preview deployments and per-deployment URLs are behind Vercel
// SSO, so the deployed function is the only place the real error exists.
//
// `onRequestError` already receives that error — this keeps the last few in
// module scope so a companion route can read them back out of the same
// warm function instance.

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

// Module scope is per-instance and resets on cold start; globalThis keeps it
// alive across the HMR/module-graph duplication Next can introduce.
const slot = globalThis as typeof globalThis & { __winlabDiagErrors?: CapturedError[] };

export function captureDiagError(entry: CapturedError): void {
  const list = (slot.__winlabDiagErrors ??= []);
  list.push(entry);
  if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES);
}

export function readDiagErrors(): CapturedError[] {
  return slot.__winlabDiagErrors ?? [];
}
