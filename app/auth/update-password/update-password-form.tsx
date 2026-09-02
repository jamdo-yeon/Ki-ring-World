"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
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
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setNotice("We couldn’t update the password. Please request a new reset email.");
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <main className="activationPage background-dots theme-pink">
      <section className="activationWindow window">
        <div className="titleBar">
          <span>♡ SET NEW PASSWORD</span>
          <span>_ □ ×</span>
        </div>
        <div className="activationContent">
          <div className="activationIcon">♡</div>
          <h1>Choose a new password</h1>
          <form className="activationForm" onSubmit={updatePassword}>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <button className="claimButton" type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save password ♡"}
            </button>
          </form>
          {notice && <p className="activationNotice" role="status">{notice}</p>}
        </div>
      </section>
    </main>
  );
}
