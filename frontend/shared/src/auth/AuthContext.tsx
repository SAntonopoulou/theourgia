/**
 * AuthContext — React-context-backed session state.
 *
 * Provider:
 *   <AuthProvider api={api}>...</AuthProvider>
 *
 * Mount once at the app root. On mount, the provider calls
 * ``api.getCurrentSession()`` to learn whether there's a live session.
 * Status starts as ``"checking"`` and resolves to ``"authenticated"``
 * or ``"unauthenticated"``.
 *
 * Consumer hooks:
 *   useAuth()    — full context object
 *   useSession() — session or null
 *   useStatus()  — "idle" | "checking" | "authenticated" | "unauthenticated"
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Api } from "../api/endpoints.js";
import { NotImplementedError, UnauthorizedError } from "../api/index.js";
import type { Session, WebauthnCredentialRead } from "../api/types.js";
import { runAssertionCeremony, runRegistrationCeremony } from "./webauthn.js";

export type AuthStatus = "idle" | "checking" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  error: Error | null;
  /** Re-check the session from the backend (or fixture). */
  refresh(): Promise<void>;
  /** Sign out — invalidates the current session. */
  signOut(): Promise<void>;
  /**
   * PHASE 02 demo signin — opens a session against a find-or-create
   * development user. Scheduled for removal once every prod user has
   * enrolled at least one WebAuthn credential.
   */
  signInDemo(input: { magickal_name: string }): Promise<void>;
  /**
   * WebAuthn discoverable-flow sign-in. Runs the browser assertion
   * ceremony, exchanges it with the backend, and flips status to
   * authenticated on success.
   */
  signInWebAuthn(): Promise<void>;
  /**
   * Enrol a new WebAuthn credential for the currently-authenticated
   * user. Runs the browser registration ceremony end-to-end.
   */
  enrolWebAuthnCredential(nickname: string): Promise<WebauthnCredentialRead>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  api: Api;
  children: ReactNode;
  /** Skip the initial refresh on mount (useful for tests). */
  skipInitialRefresh?: boolean;
}

export function AuthProvider({ api, children, skipInitialRefresh = false }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>(skipInitialRefresh ? "idle" : "checking");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setStatus("checking");
    setError(null);
    try {
      const next = await api.getCurrentSession();
      if (!mounted.current) return;
      if (next) {
        setSession(next);
        setStatus("authenticated");
      } else {
        setSession(null);
        setStatus("unauthenticated");
      }
    } catch (e) {
      if (!mounted.current) return;
      if (e instanceof UnauthorizedError || e instanceof NotImplementedError) {
        // Backend route not live yet, or we genuinely have no session.
        setSession(null);
        setStatus("unauthenticated");
        setError(null);
        return;
      }
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus("unauthenticated");
    }
  }, [api]);

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } catch (e) {
      // Even if the network call fails, drop the local session.
      if (!(e instanceof NotImplementedError)) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (!mounted.current) return;
    setSession(null);
    setStatus("unauthenticated");
  }, [api]);

  const signInDemo = useCallback(
    async (input: { magickal_name: string }) => {
      setError(null);
      setStatus("checking");
      try {
        const next = await api.demoSignIn(input);
        if (!mounted.current) return;
        setSession(next);
        setStatus("authenticated");
      } catch (e) {
        if (!mounted.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("unauthenticated");
        throw e;
      }
    },
    [api],
  );

  const signInWebAuthn = useCallback(async () => {
    setError(null);
    setStatus("checking");
    try {
      const options = (await api.webauthnAssertBegin()) as unknown as Parameters<
        typeof runAssertionCeremony
      >[0];
      const credential = await runAssertionCeremony(options);
      const next = await api.webauthnAssertFinish({ credential });
      if (!mounted.current) return;
      setSession(next);
      setStatus("authenticated");
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus("unauthenticated");
      throw e;
    }
  }, [api]);

  const enrolWebAuthnCredential = useCallback(
    async (nickname: string): Promise<WebauthnCredentialRead> => {
      const options = (await api.webauthnRegisterBegin()) as unknown as Parameters<
        typeof runRegistrationCeremony
      >[0];
      const credential = await runRegistrationCeremony(options);
      return api.webauthnRegisterFinish({ credential, nickname });
    },
    [api],
  );

  useEffect(() => {
    if (skipInitialRefresh) return;
    void refresh();
  }, [skipInitialRefresh, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      error,
      refresh,
      signOut,
      signInDemo,
      signInWebAuthn,
      enrolWebAuthnCredential,
    }),
    [
      status,
      session,
      error,
      refresh,
      signOut,
      signInDemo,
      signInWebAuthn,
      enrolWebAuthnCredential,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return ctx;
}

export function useSession(): Session | null {
  return useAuth().session;
}

export function useStatus(): AuthStatus {
  return useAuth().status;
}
