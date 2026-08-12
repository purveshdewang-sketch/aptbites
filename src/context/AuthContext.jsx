import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

const LOGIN_MODE_STORAGE_KEY = "NeFo_login_mode";

function getLoginModeFromCurrentPage() {
  if (typeof window === "undefined") {
    return "customer";
  }

  return window.location.pathname.startsWith("/seller-login")
    ? "seller"
    : "customer";
}

function getStoredLoginMode() {
  if (typeof window === "undefined") {
    return "customer";
  }

  const storedMode = window.localStorage.getItem(LOGIN_MODE_STORAGE_KEY);

  return storedMode === "seller" ? "seller" : "customer";
}

function storeLoginMode(mode) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    LOGIN_MODE_STORAGE_KEY,
    mode === "seller" ? "seller" : "customer"
  );
}

function clearLoginMode() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(LOGIN_MODE_STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [loginMode, setLoginMode] = useState(() => getStoredLoginMode());

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      setAuthLoading(true);
      setAuthError("");

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          setAuthError(error.message);
          setSession(null);
          setUser(null);
          setAuthLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setLoginMode(getStoredLoginMode());
        }

        setAuthLoading(false);
      } catch (error) {
        if (!mounted) return;

        setAuthError(error.message || "Could not load login session.");
        setSession(null);
        setUser(null);
        setAuthLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthLoading(false);
      setAuthError("");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signUp(email, password, metadata = {}) {
    setAuthError("");

    const requestedMode = getLoginModeFromCurrentPage();
    storeLoginMode(requestedMode);
    setLoginMode(requestedMode);

    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (result.error) {
      setAuthError(result.error.message);
      clearLoginMode();
      setLoginMode("customer");
    }

    return result;
  }

  async function signIn(email, password) {
    setAuthError("");

    const requestedMode = getLoginModeFromCurrentPage();
    storeLoginMode(requestedMode);
    setLoginMode(requestedMode);

    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (result.error) {
      setAuthError(result.error.message);
      clearLoginMode();
      setLoginMode("customer");
    } else {
      setSession(result.data?.session ?? null);
      setUser(result.data?.user ?? null);
      storeLoginMode(requestedMode);
      setLoginMode(requestedMode);
    }

    return result;
  }

  async function signOut() {
    setAuthError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setAuthError(error.message);
        return { error };
      }

      setSession(null);
      setUser(null);
      clearLoginMode();
      setLoginMode("customer");

      return { error: null };
    } catch (error) {
      const message = error.message || "Could not sign out.";
      setAuthError(message);
      return { error: { message } };
    }
  }

  const value = useMemo(
    () => ({
      session,
      user,
      authLoading,
      authError,
      isAuthenticated: Boolean(user),
      loginMode,
      signUp,
      signIn,
      signOut,
    }),
    [session, user, authLoading, authError, loginMode]
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