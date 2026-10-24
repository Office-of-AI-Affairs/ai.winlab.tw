"use client";

import type { Profile } from "@winlab/db";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authPost } from "@/lib/auth/client";

/** The signed-in account. The profile carries the name and role. */
export type AuthUser = { id: string; email: string };

type AuthContextType = {
  user: AuthUser | null;
  profile: Profile | null;
  isAdmin: boolean;
  isVendor: boolean;
  isMember: boolean;
  /** `profile.role === 'editor'` — draft-only announcements/results, never publish. See CLAUDE.md "Editorial workflow". */
  isEditor: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadMe(): Promise<{ user: AuthUser | null; profile: Profile | null }> {
  const res = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) return { user: null, profile: null };
  return res.json();
}

// The root layout is cookieless so pages can be static; the session is
// read here after mount, from /api/me.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const me = await loadMe().catch(() => ({ user: null, profile: null }));
    setUser(me.user);
    setProfile(me.profile);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadMe()
      .catch(() => ({ user: null, profile: null }))
      .then((me) => {
        if (cancelled) return;
        setUser(me.user);
        setProfile(me.profile);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await authPost("/sign-in/email", { email, password });
      if (!result.ok) return { error: result.code ?? "sign_in_failed" };
      await refresh();
      router.push("/");
      router.refresh();
      return {};
    },
    [refresh, router],
  );

  const signOut = useCallback(async () => {
    await authPost("/sign-out");
    setUser(null);
    setProfile(null);
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin: profile?.role === "admin",
        isVendor: profile?.role === "vendor",
        isMember: profile?.role === "member",
        isEditor: profile?.role === "editor",
        isLoading,
        signIn,
        signOut,
        refreshProfile: refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
