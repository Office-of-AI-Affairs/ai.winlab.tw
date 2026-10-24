import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth";

// OpenID discovery for clients that look here instead of RFC 8414.
export const GET = oauthProviderOpenIdConfigMetadata(auth);
