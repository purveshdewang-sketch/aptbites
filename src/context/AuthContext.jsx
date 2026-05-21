import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function cleanPhone(phone) {
    return String(phone || "").replace(/\D/g, "");
  }

  function formatPhoneForSupabase(phone) {
    const rawPhone = String(phone || "").trim();
    const cleanedPhone = cleanPhone(rawPhone);

    if (rawPhone.startsWith("+")) return rawPhone;

    if (cleanedPhone.length === 10) {
      return `+91${cleanedPhone}`;
    }

    if (cleanedPhone.length === 12 && cleanedPhone.startsWith("91")) {
      return `+${cleanedPhone}`;
    }

    return `+${cleanedPhone}`;
  }

  async function sendPhoneOtp(phone) {
    return supabase.auth.signInWithOtp({
      phone: formatPhoneForSupabase(phone),
    });
  }

  async function verifyPhoneOtp(phone, token) {
    return supabase.auth.verifyOtp({
      phone: formatPhoneForSupabase(phone),
      token: String(token || "").trim(),
      type: "sms",
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      session,
      user,
      authLoading,
      isAuthenticated: Boolean(user),
      cleanPhone,
      formatPhoneForSupabase,
      sendPhoneOtp,
      verifyPhoneOtp,
      signOut,
    }),
    [session, user, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}