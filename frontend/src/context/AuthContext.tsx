import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("access_token")
  );

  // Keep localStorage in sync whenever token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem("access_token", token);
    } else {
      localStorage.removeItem("access_token");
    }
  }, [token]);

  const signIn = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? "Login failed.");
    }

    const data = await res.json(); // { access_token, token_type }
    localStorage.setItem("access_token", data.access_token);
    setToken(data.access_token);
  };

  const signUp = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Backend RegisterRequest expects name, email, password.
      // We use the email prefix as a default name — update if you collect name separately.
      body: JSON.stringify({ name: email.split("@")[0], email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? "Registration failed.");
    }

    const data = await res.json(); // { access_token, token_type }
    localStorage.setItem("access_token", data.access_token);
    setToken(data.access_token);
  };

  const isAuthenticated = Boolean(token);

  // Your FastAPI backend has no reset-password endpoint.
  // This stub throws a clear error so Auth.tsx surfaces it gracefully.
  // Wire it up to a real endpoint (e.g. POST /auth/reset-password) when ready.
  const resetPassword = async (_email: string) => {
    throw new Error("Password reset is not yet supported.");
  };

  const signOut = () => {
    localStorage.removeItem("access_token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, signIn, signUp, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};