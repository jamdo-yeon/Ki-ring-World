"use client";

import { useState, type FormEvent } from "react";
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
}: {
  publicId: string;
  state: ExperienceState;
  keyring?: Keyring;
  profile?: KeyringProfile;
  initialUserId?: string | null;
  message?: string;
  missingEnvVars?: string[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isOwner = Boolean(initialUserId && keyring?.owner_id === initialUserId);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setNotice("Supabase environment variables are missing.");
      return;
    }

    setBusy(true);
    setNotice("");
    const next = `/k/${encodeURIComponent(publicId)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    setNotice(error ? error.message : "Magic link sent! Check your email ♡");
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
      setNotice(error.message);
      router.refresh();
      return;
    }
    router.refresh();
  }

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
          ) : null}
        </div>
        <WorldApp
          initialWorld={profileToWorld(profile)}
          mode={isOwner ? "owner" : "visitor"}
          onSave={isOwner ? saveProfile : undefined}
          localStorageKey={`kiring-world-keyring-${publicId}`}
        />
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
              {!initialUserId && <AuthForm {...{ email, setEmail, sendMagicLink, busy }} />}
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
                <AuthForm {...{ email, setEmail, sendMagicLink, busy }} />
              )}
            </>
          )}
          {notice && <p className="activationNotice" role="status">{notice}</p>}
        </div>
      </section>
    </main>
  );
}

function AuthForm({
  email,
  setEmail,
  sendMagicLink,
  busy,
}: {
  email: string;
  setEmail: (value: string) => void;
  sendMagicLink: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
}) {
  return (
    <form className="activationForm" onSubmit={sendMagicLink}>
      <label>
        Email
        <input type="email" required value={email} placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} />
      </label>
      <button className="claimButton" type="submit" disabled={busy}>
        {busy ? "Sending..." : "Sign in with a magic link ♡"}
      </button>
      <small>We’ll email you a one-time sign-in link.</small>
    </form>
  );
}
