"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { WorldApp } from "@/app/world-app";
import {
  profileToWorld,
  worldToProfileUpdate,
  type Keyring,
  type KeyringProfile,
} from "@/lib/keyrings";
import { createClient } from "@/lib/supabase/client";
import type { WorldData } from "@/app/world-data";
import type { ServerGuestbookEntry } from "@/lib/guestbook";
import { ServerGuestbook } from "./server-guestbook";
import type { VisitCounts } from "@/lib/visits";
import { VisitCounter } from "./visit-counter";
import { OwnerSignInModal } from "./owner-sign-in-modal";

type ExperienceState =
  | "not-configured"
  | "not-found"
  | "unclaimed"
  | "private"
  | "world"
  | "error";

export function KeyringExperience({
  publicId,
  state,
  keyring,
  profile,
  initialUserId = null,
  message,
  missingEnvVars = [],
  initialGuestbookEntries = [],
  initialGuestbookError,
  initialVisitCounts = null,
  autoClaim = false,
}: {
  publicId: string;
  state: ExperienceState;
  keyring?: Keyring;
  profile?: KeyringProfile;
  initialUserId?: string | null;
  message?: string;
  missingEnvVars?: string[];
  initialGuestbookEntries?: ServerGuestbookEntry[];
  initialGuestbookError?: string;
  initialVisitCounts?: VisitCounts | null;
  autoClaim?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerSignInOpen, setOwnerSignInOpen] = useState(false);
  const ownerSignInTriggerRef = useRef<HTMLButtonElement>(null);
  const ownerEmailInputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(busy);
  const autoClaimStartedRef = useRef(false);
  const isOwner = Boolean(initialUserId && keyring?.owner_id === initialUserId);

  useEffect(() => {
    if (!ownerSignInOpen) return;

    const signInTrigger = ownerSignInTriggerRef.current;
    ownerEmailInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) {
        setNotice("");
        setOwnerSignInOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      signInTrigger?.focus();
    };
  }, [ownerSignInOpen]);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setNotice("Supabase environment variables are missing.");
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setNotice("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    busyRef.current = false;
    setBusy(false);
    if (error) {
      setNotice(error.code === "email_not_confirmed"
        ? "Please verify your email first ♡"
        : "Incorrect email or password.");
      return;
    }

    if (data.user.id !== keyring?.owner_id) {
      setNotice("This account doesn't own this Ki-ring.");
      return;
    }

    setOwnerSignInOpen(false);
    router.refresh();
  }

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setNotice("Passwords don’t match.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setNotice("Supabase environment variables are missing.");
      return;
    }

    setBusy(true);
    setNotice("");
    const next = `/k/${encodeURIComponent(publicId)}?claim=1`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);

    if (error) {
      setNotice(error.code === "user_already_exists"
        ? "An account already exists. Please sign in instead."
        : "We couldn’t create the account. Check your details and try again.");
      return;
    }

    if (data.session) {
      await claimKeyring();
      return;
    }

    setNotice("Check your inbox to verify your account ♡");
  }

  async function sendPasswordReset() {
    const supabase = createClient();
    if (!supabase || !email.trim()) return;

    busyRef.current = true;
    setBusy(true);
    setNotice("");
    const keyringPath = `/k/${encodeURIComponent(publicId)}`;
    const updatePath = `/auth/update-password?next=${encodeURIComponent(keyringPath)}`;
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(updatePath)}`,
    });
    busyRef.current = false;
    setBusy(false);
    setNotice("If that account exists, a password reset email is on its way ♡");
  }

  async function claimKeyring() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setNotice("");
    const { error } = await supabase.rpc("claim_keyring", {
      target_public_id: publicId,
    });
    setBusy(false);
    if (error) {
      setNotice("We couldn’t claim this Ki-ring. Please refresh and try again.");
      router.refresh();
      return;
    }
    router.refresh();
  }

  useEffect(() => {
    if (!autoClaim || state !== "unclaimed" || !initialUserId || autoClaimStartedRef.current) {
      return;
    }

    autoClaimStartedRef.current = true;
    const supabase = createClient();
    if (!supabase) return;

    void supabase.rpc("claim_keyring", { target_public_id: publicId }).then(({ error }) => {
      if (error) {
        setNotice("We couldn’t claim this Ki-ring. Please refresh and try again.");
        return;
      }
      router.replace(`/k/${encodeURIComponent(publicId)}`);
      router.refresh();
    });
  }, [autoClaim, initialUserId, publicId, router, state]);

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.refresh();
  }

  async function saveProfile(world: WorldData) {
    const supabase = createClient();
    if (!supabase || !keyring) {
      throw new Error("Supabase is not configured.");
    }
    const { error } = await supabase
      .from("profiles")
      .update(worldToProfileUpdate(world))
      .eq("keyring_id", keyring.id);
    if (error) throw error;
    router.refresh();
  }

  if (state === "world" && profile && keyring) {
    return (
      <>
        <div className="keyringSessionBar">
          <span>{isOwner ? "OWNER MODE ♡" : "VISITOR MODE"}</span>
          {initialUserId ? (
            <button type="button" onClick={signOut}>Sign out</button>
          ) : !isOwner ? (
            <button
              ref={ownerSignInTriggerRef}
              className="ownerSignInToggle"
              type="button"
              aria-expanded={ownerSignInOpen}
              aria-controls="owner-sign-in-dialog"
              onClick={() => {
                setNotice("");
                setOwnerSignInOpen((current) => !current);
              }}
            >
              owner? sign in
            </button>
          ) : null}
        </div>
        <WorldApp
          initialWorld={profileToWorld(profile)}
          mode={isOwner ? "owner" : "visitor"}
          onSave={isOwner ? saveProfile : undefined}
          localStorageKey={`kiring-world-keyring-${publicId}`}
          visitorCounter={
            <VisitCounter
              publicId={publicId}
              initialCounts={initialVisitCounts}
            />
          }
          guestbookPanel={
            <ServerGuestbook
              keyringId={keyring.id}
              userId={initialUserId}
              isOwner={isOwner}
              initialEntries={initialGuestbookEntries}
              initialError={initialGuestbookError}
            />
          }
        />
        {!initialUserId && !isOwner && ownerSignInOpen && (
          <OwnerSignInModal
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            signIn={signInWithPassword}
            forgotPassword={sendPasswordReset}
            busy={busy}
            notice={notice}
            inputRef={ownerEmailInputRef}
            close={() => {
              setNotice("");
              setOwnerSignInOpen(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <main className="activationPage background-dots theme-pink">
      <section className="activationWindow window">
        <div className="titleBar">
          <span>♡ KI-RING WORLD</span>
          <span>_ □ ×</span>
        </div>
        <div className="activationContent">
          {state === "not-configured" && (
            <>
              <div className="activationIcon">⚙</div>
              <h1>Supabase setup needed</h1>
              <p>Add the variables from <code>.env.example</code> to <code>.env.local</code>, then restart Next.js.</p>
              {missingEnvVars.length > 0 && (
                <div className="missingEnvMessage">
                  <strong>Missing:</strong>
                  {missingEnvVars.map((name) => <code key={name}>{name}</code>)}
                </div>
              )}
            </>
          )}
          {state === "not-found" && (
            <>
              <div className="activationIcon">?</div>
              <h1>Ki-ring not found...</h1>
              <p>This tiny URL does not belong to a registered Ki-ring yet.</p>
            </>
          )}
          {state === "private" && (
            <>
              <div className="activationIcon">♡</div>
              <h1>This world is resting</h1>
              <p>Its owner has not published it yet.</p>
              {!initialUserId && (
                <button
                  ref={ownerSignInTriggerRef}
                  className="claimButton"
                  type="button"
                  onClick={() => setOwnerSignInOpen(true)}
                >
                  owner? sign in
                </button>
              )}
            </>
          )}
          {state === "error" && (
            <>
              <div className="activationIcon">!</div>
              <h1>Connection got tangled</h1>
              <p>{message ?? "Please try again in a moment."}</p>
            </>
          )}
          {state === "unclaimed" && (
            <>
              <div className="activationIcon">♡</div>
              <h1>This Ki-ring is waiting for you ♡</h1>
              <p>Activate <strong>{publicId}</strong> to make this tiny world yours.</p>
              {initialUserId ? (
                <button className="claimButton" type="button" disabled={busy} onClick={claimKeyring}>
                  {busy ? "Claiming..." : "Claim this Ki-ring ♡"}
                </button>
              ) : (
                <SignUpForm
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  signUp={signUp}
                  busy={busy}
                />
              )}
            </>
          )}
          {notice && <p className="activationNotice" role="status">{notice}</p>}
        </div>
      </section>
      {state === "private" && !initialUserId && ownerSignInOpen && (
        <OwnerSignInModal
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          signIn={signInWithPassword}
          forgotPassword={sendPasswordReset}
          busy={busy}
          notice={notice}
          inputRef={ownerEmailInputRef}
          close={() => {
            setNotice("");
            setOwnerSignInOpen(false);
          }}
        />
      )}
    </main>
  );
}

function SignUpForm({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  signUp,
  busy,
}: {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  signUp: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
}) {
  return (
    <form className="activationForm" onSubmit={signUp}>
      <label>
        Email
        <input type="email" autoComplete="email" required value={email} placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Password
        <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <label>
        Confirm password
        <input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      </label>
      <button className="claimButton" type="submit" disabled={busy}>
        {busy ? "Creating account..." : "Create account ♡"}
      </button>
      <small>We’ll email you a verification link before this Ki-ring is claimed.</small>
    </form>
  );
}
