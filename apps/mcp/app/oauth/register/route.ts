import { ZodError } from "zod";
import { registerOAuthClient } from "@/lib/auth/oauth-clients";

export async function POST(request: Request) {
  try {
    const client = await registerOAuthClient(await request.json());
    return Response.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: "invalid_client_metadata",
          error_description: error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 },
      );
    }

    // Don't leak the inner error (Postgres/PostgREST text) to the caller.
    console.error("oauth client registration failed:", error);
    return Response.json(
      {
        error: "server_error",
        error_description: "Failed to register client",
      },
      { status: 500 },
    );
  }
}
