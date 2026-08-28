/**
 * Auth — platform-split:
 *
 * WEB    — OAuth PKCE via popup window (avoids X-Frame-Options on OAuth pages).
 *          Token stored in localStorage; used as Bearer header for API calls.
 *
 * NATIVE — expo-auth-session PKCE → server token exchange → SecureStore.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "auth_session_token";
const PKCE_KEY = "oauth_pkce";

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (hint?: "login" | "signup") => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

function getClientId(): string {
  return process.env.EXPO_PUBLIC_REPL_ID ?? "";
}

// ─── Web PKCE helpers ─────────────────────────────────────────────────────────

function randomB64(byteLen: number): string {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function pkceChallenge(verifier: string): Promise<string> {
  const buf = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

interface PkceStore {
  code_verifier: string;
  state: string;
  nonce: string;
  redirect_uri: string;
}

// ─── Web Auth Provider ────────────────────────────────────────────────────────

function WebAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Token-based user fetch ──────────────────────────────────────────────────
  const fetchUser = useCallback(async (): Promise<User | null> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const res = await fetch(`${getApiBase()}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("not_ok");
      const data = (await res.json()) as { user: User | null };
      if (data.user) return data.user;
    } catch {
      // session invalid
    }
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }, []);

  // ── On mount: detect popup callback OR restore session ─────────────────────
  useEffect(() => {
    void (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");

      // Running inside the popup window after OAuth redirect
      if (code && returnedState && window.opener) {
        url.searchParams.delete("code");
        url.searchParams.delete("state");
        url.searchParams.delete("iss");
        window.history.replaceState({}, "", url.toString());

        const rawPkce = sessionStorage.getItem(PKCE_KEY);
        if (rawPkce) {
          const pkce = JSON.parse(rawPkce) as PkceStore;
          sessionStorage.removeItem(PKCE_KEY);

          if (returnedState === pkce.state) {
            try {
              const res = await fetch(
                `${getApiBase()}/api/mobile-auth/token-exchange`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    code,
                    code_verifier: pkce.code_verifier,
                    redirect_uri: pkce.redirect_uri,
                    state: returnedState,
                    nonce: pkce.nonce,
                  }),
                },
              );
              if (res.ok) {
                const data = (await res.json()) as { token?: string };
                if (data.token) {
                  localStorage.setItem(TOKEN_KEY, data.token);
                  // Tell the opener auth is done, then close
                  window.opener.postMessage(
                    { type: "AUTH_COMPLETE" },
                    window.location.origin,
                  );
                }
              }
            } catch {
              // token exchange failed
            }
          }
        }
        // Always close the popup after handling
        window.close();
        return;
      }

      // Main window — restore existing session
      const u = await fetchUser();
      setUser(u);
      setIsLoading(false);
    })();
  }, [fetchUser]);

  // ── Listen for popup completing auth ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: string })?.type === "AUTH_COMPLETE") {
        void (async () => {
          const u = await fetchUser();
          setUser(u);
          setIsLoading(false);
        })();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [fetchUser]);

  // ── Login — opens popup so OAuth page isn't blocked by iframe ─────────────
  const login = useCallback(async (hint?: "login" | "signup") => {
    try {
      const discoRes = await fetch(
        `${ISSUER_URL}/.well-known/openid-configuration`,
      );
      const disco = (await discoRes.json()) as {
        authorization_endpoint: string;
      };

      const codeVerifier = randomB64(48);
      const codeChallenge = await pkceChallenge(codeVerifier);
      const state = randomB64(24);
      const nonce = randomB64(24);
      const redirectUri = window.location.origin + "/";

      const pkce: PkceStore = {
        code_verifier: codeVerifier,
        state,
        nonce,
        redirect_uri: redirectUri,
      };
      // sessionStorage is shared between same-origin windows (including popups)
      sessionStorage.setItem(PKCE_KEY, JSON.stringify(pkce));

      const authUrl = new URL(disco.authorization_endpoint);
      authUrl.searchParams.set("client_id", getClientId());
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile offline_access");
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("nonce", nonce);
      authUrl.searchParams.set("prompt", "login consent");
      if (hint === "signup") {
        authUrl.searchParams.set("screen_hint", "signup");
      }

      // Open in popup — avoids X-Frame-Options restrictions on OAuth pages
      const popup = window.open(
        authUrl.toString(),
        "oauth_login",
        "width=520,height=640,left=200,top=100,resizable=yes,scrollbars=yes",
      );

      if (!popup) {
        // Popup blocked — fall back to same-tab redirect
        sessionStorage.setItem(PKCE_KEY, JSON.stringify({ ...pkce, fallback: true }));
        window.location.href = authUrl.toString();
      }
    } catch {
      // OIDC discovery failed
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    if (token) {
      try {
        await fetch(`${getApiBase()}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Native Auth Provider ─────────────────────────────────────────────────────

function NativeAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const discovery = AuthSession.useAutoDiscovery(ISSUER_URL);
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "mobile" });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getClientId(),
      scopes: ["openid", "email", "profile", "offline_access"],
      redirectUri,
      prompt: AuthSession.Prompt.Login,
    },
    discovery,
  );

  const fetchUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const res = await fetch(`${getApiBase()}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { user: User | null };
      if (data.user) {
        setUser(data.user);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (response?.type !== "success" || !request?.codeVerifier) return;
    const { code, state } = response.params;
    void (async () => {
      try {
        const base = getApiBase();
        if (!base) return;
        const res = await fetch(`${base}/api/mobile-auth/token-exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            code_verifier: request.codeVerifier,
            redirect_uri: redirectUri,
            state,
            nonce: request.nonce,
          }),
        });
        if (!res.ok) {
          setIsLoading(false);
          return;
        }
        const data = (await res.json()) as { token?: string };
        if (data.token) {
          await SecureStore.setItemAsync(TOKEN_KEY, data.token);
          setIsLoading(true);
          await fetchUser();
        }
      } catch {
        setIsLoading(false);
      }
    })();
  }, [response, request, redirectUri, fetchUser]);

  const login = useCallback(
    async (_hint?: "login" | "signup") => {
      try {
        await promptAsync();
      } catch {
        // user cancelled
      }
    },
    [promptAsync],
  );

  const logout = useCallback(async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      try {
        await fetch(`${getApiBase()}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === "web") {
    return <WebAuthProvider>{children}</WebAuthProvider>;
  }
  return <NativeAuthProvider>{children}</NativeAuthProvider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
