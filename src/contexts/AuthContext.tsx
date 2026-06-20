"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  initGis,
  setTokenChangeListener,
  getAccessToken,
  requestLogin,
  requestSilentRefresh,
  logout as doLogout,
} from "@/lib/auth";

interface AuthState {
  token: string | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let settled = false;
    setTokenChangeListener((t) => {
      settled = true;
      setToken(t);
      setLoading(false);
      if (t) {
        localStorage.setItem("classpilot_has_consented", "1");
      }
    });
    initGis().then(() => {
      const existing = getAccessToken();
      if (existing) {
        settled = true;
        setToken(existing);
        setLoading(false);
      } else if (localStorage.getItem("classpilot_has_consented")) {
        requestSilentRefresh();
        setTimeout(() => {
          if (!settled) setLoading(false);
        }, 3000);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const login = useCallback(() => requestLogin(), []);
  const logout = useCallback(() => {
    doLogout();
    setToken(null);
    localStorage.removeItem("classpilot_has_consented");
  }, []);

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
