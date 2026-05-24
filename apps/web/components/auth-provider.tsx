"use client";

import type { Database, Profile } from "@winlab/db";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Lazy-load the browser Supabase client only when AuthProvider actually needs
// it (i.e. after mount, on sign-in, etc.). Visitors with no session never pay
// the ~30 KB gz cost of `@supabase/ssr` + `@supabase/auth-js` on first load.
// `@/lib/supabase/client` is dynamically imported below so webpack splits it
// out of every chunk whose only need for it was the root-layout AuthProvider.

type BrowserClient = SupabaseClient<Database>;

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isVendor: boolean;
  isMember: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Module-level singleton so multiple AuthProvider mounts (HMR, etc.) share one
// client. The previous synchronous `createClient()`-from-`client.ts` returned
// a fresh instance per call, but auth tokens live in cookies so the underlying
// GoTrueClient ends up reading the same state regardless.
let clientPromise: Promise<BrowserClient> | null = null;
function loadClient(): Promise<BrowserClient> {
  if (!clientPromise) {
    // Dynamic import → webpack splits `@supabase/ssr` (and its
    // `@supabase/auth-js` payload, where not already pulled in elsewhere on
    // the route) into a separate async chunk that visitors never request.
    clientPromise = import("@/lib/supabase/client").then(
      (m) => m.createClient() as BrowserClient,
    );
  }
  return clientPromise;
}

export function AuthProvider({
  children,
  initialUser,
  initialProfile,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
  initialProfile?: Profile | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [profile, setProfile] = useState<Profile | null>(initialProfile ?? null);
  const [isLoading, setIsLoading] = useState(initialUser === undefined ? true : false);
  const userIdRef = useRef<string | null>(initialUser?.id ?? null);
  const router = useRouter();
  const userId = user?.id ?? null;

  const fetchProfile = useCallback(async (uid: string) => {
    const supabase = await loadClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile:", error);
      return null;
    }

    if (data) {
      setProfile(data as Profile);
      return data as Profile;
    }

    // Ensure profile exists (e.g. trigger missed)
    const { data: inserted } = await supabase
      .from("profiles")
      .insert({ id: uid, role: "user" })
      .select()
      .single();

    if (inserted) {
      setProfile(inserted as Profile);
      return inserted as Profile;
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userId) await fetchProfile(userId);
  }, [fetchProfile, userId]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      const supabase = await loadClient();
      if (cancelled) return;

      if (initialUser === undefined) {
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        userIdRef.current = u?.id ?? null;
        setUser(u);
        if (u?.id) {
          await fetchProfile(u.id);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        // During password recovery, do not update auth state —
        // the reset-password page handles this flow independently.
        if (event === "PASSWORD_RECOVERY") return;

        const newUserId = session?.user?.id ?? null;

        // Skip if user hasn't actually changed (e.g. token refresh on tab focus).
        // This prevents unnecessary re-renders that reset edit page state.
        if (newUserId === userIdRef.current) {
          setIsLoading(false);
          return;
        }

        userIdRef.current = newUserId;
        setUser(session?.user ?? null);
        if (newUserId) {
          fetchProfile(newUserId);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      });

      unsubscribe = () => subscription.unsubscribe();
      if (cancelled) {
        // Mount/unmount raced before the client resolved.
        unsubscribe();
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [fetchProfile, initialUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = await loadClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      router.push("/");
      router.refresh();
      return {};
    },
    [router]
  );

  const signOut = useCallback(async () => {
    const supabase = await loadClient();
    await supabase.auth.signOut();
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
        isLoading,
        signIn,
        signOut,
        refreshProfile,
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
