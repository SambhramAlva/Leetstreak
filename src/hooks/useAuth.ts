import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
};

// Single source of truth for the auth session, kept in sync with Supabase's
// own auth state listener (handles token refresh, sign-out, etc.).
export function useAuth() {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, loading: false });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      // Create the profile row right away so the rest of the app can rely on it existing.
      const { error: profileErr } = await supabase
        .from("profiles")
        .insert({ id: data.user.id, username });
      if (profileErr) throw profileErr;
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session: state.session, loading: state.loading, signUp, signIn, signOut };
}
