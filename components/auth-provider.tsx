"use client";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const userId = user?.id ?? null;

  const fetchProfile = useCallback(
    async (uid: string) => {
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
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (userId) await fetchProfile(userId);
  }, [fetchProfile, userId]);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
        userIdRef.current = u?.id ?? null;
        setUser(u);
      if (u?.id) {
        await fetchProfile(u.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    };

    getUser();

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

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
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
    [supabase.auth, router]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.refresh();
  }, [supabase.auth, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin: profile?.role === "admin",
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
