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
    setTokenChangeListener((t) => {
      setToken(t);
      setLoading(false);
    });
    initGis().then(() => {
      setToken(getAccessToken());
      setLoading(false);
    });
  }, []);

  const login = useCallback(() => requestLogin(), []);
  const logout = useCallback(() => {
    doLogout();
    setToken(null);
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
