import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearToken,
  getToken,
  onUnauthorized,
  setToken,
} from "../api/client";
import {
  changePassword as apiChangePassword,
  fetchMe,
  loginUser,
  type Role,
  type TokenResponse,
  type UserPublic,
} from "../api/auth";

interface AuthContextValue {
  user: UserPublic | null;
  loading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (username: string, password: string) => Promise<TokenResponse>;
  logout: () => void;
  changePassword: (current: string, next: string) => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // Bootstrap: if we have a stored token, validate it by loading the profile.
  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Global 401 handler: drop the session so the app shows the login screen.
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  const login = useCallback(
    async (username: string, password: string): Promise<TokenResponse> => {
      const res = await loginUser(username, password);
      setToken(res.access_token);
      setUser(res.user);
      return res;
    },
    []
  );

  const changePassword = useCallback(
    async (current: string, next: string): Promise<void> => {
      const res = await apiChangePassword(current, next);
      setToken(res.access_token);
      setUser(res.user);
    },
    []
  );

  const refresh = useCallback(async (): Promise<void> => {
    const me = await fetchMe();
    setUser(me);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]): boolean => {
      if (!user) return false;
      if (user.role === "superadmin") return true;
      return roles.includes(user.role);
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      mustChangePassword: !!user?.must_change_password,
      login,
      logout,
      changePassword,
      hasRole,
      isAdmin: user?.role === "admin" || user?.role === "superadmin",
      refresh,
    }),
    [user, loading, login, logout, changePassword, hasRole, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
