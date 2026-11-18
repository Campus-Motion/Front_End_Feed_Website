import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "../api/client.js";

/**
 * Signed-in user for the whole app.
 *
 * status: "loading" while a stored token is checked on page load,
 *         then "signedIn" (user is the /users/me profile) or "signedOut".
 */
const AuthContext = createContext(null);

// Seconds since epoch at which the JWT expires, or null if it can't be read.
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function isExpired(token) {
  const exp = tokenExpiry(token);
  return exp !== null && exp * 1000 <= Date.now();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() =>
    api.getToken() ? "loading" : "signedOut",
  );

  const signOut = useCallback(() => {
    api.clearToken();
    setUser(null);
    setStatus("signedOut");
  }, []);

  // Restore the session from a token stored by an earlier visit.
  useEffect(() => {
    const token = api.getToken();
    if (!token) return;
    if (isExpired(token)) {
      signOut();
      return;
    }
    let cancelled = false;
    api
      .getMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("signedIn");
      })
      .catch((e) => {
        if (cancelled) return;
        // 401: the token was revoked or the secret changed. Any other error
        // (network, server down) also leaves us without a profile to show.
        if (e.status === 401) api.clearToken();
        setUser(null);
        setStatus("signedOut");
      });
    return () => {
      cancelled = true;
    };
  }, [signOut]);

  // The backend issues 24 h tokens with no refresh: sign out when it expires.
  useEffect(() => {
    if (status !== "signedIn") return;
    const exp = tokenExpiry(api.getToken() ?? "");
    if (exp === null) return;
    // setTimeout overflows above ~24.8 days; tokens here last at most 7 days.
    const id = setTimeout(signOut, Math.max(0, exp * 1000 - Date.now()));
    return () => clearTimeout(id);
  }, [status, signOut]);

  const signIn = useCallback(async (email, password) => {
    const { access_token } = await api.login({ email, password });
    api.setToken(access_token);
    try {
      const me = await api.getMe();
      setUser(me);
      setStatus("signedIn");
    } catch (e) {
      api.clearToken();
      throw e;
    }
  }, []);

  // Register returns no token, so sign in right after with the same details.
  // If only that sign-in fails, the error says the account exists anyway.
  const signUp = useCallback(
    async (username, email, password) => {
      await api.register({ username, email, password });
      try {
        await signIn(email, password);
      } catch (e) {
        e.accountCreated = true;
        throw e;
      }
    },
    [signIn],
  );

  const value = useMemo(
    () => ({ user, status, signIn, signUp, signOut }),
    [user, status, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** { user, status, signIn(email, password), signUp(username, email, password), signOut() } */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
