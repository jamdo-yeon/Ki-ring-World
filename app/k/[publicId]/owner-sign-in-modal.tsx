"use client";

import { createPortal } from "react-dom";
import type { FormEvent, MouseEvent, RefObject } from "react";

export function OwnerSignInModal({
  email,
  setEmail,
  password,
  setPassword,
  signIn,
  forgotPassword,
  busy,
  notice,
  inputRef,
  close,
}: {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  signIn: (event: FormEvent<HTMLFormElement>) => void;
  forgotPassword: () => void;
  busy: boolean;
  notice: string;
  inputRef: RefObject<HTMLInputElement | null>;
  close: () => void;
}) {
  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !busy) {
      close();
    }
  }

  return createPortal(
    <div
      className="ownerSignInBackdrop"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <section
        className="ownerSignInDialog"
        id="owner-sign-in-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-sign-in-title"
      >
        <div className="ownerSignInTitleBar">
          <h2 id="owner-sign-in-title">♡ OWNER SIGN IN</h2>
          <button
            type="button"
            disabled={busy}
            aria-label="Close owner sign in"
            onClick={close}
          >
            ×
          </button>
        </div>

        <form onSubmit={signIn}>
          <label htmlFor="owner-sign-in-email">email</label>
          <input
            ref={inputRef}
            id="owner-sign-in-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="owner-sign-in-password">password</label>
          <input
            id="owner-sign-in-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? "signing in..." : "sign in ♡"}
          </button>
          <button
            className="ownerForgotPassword"
            type="button"
            disabled={busy || !email.trim()}
            onClick={forgotPassword}
          >
            forgot password?
          </button>
        </form>

        {notice && <p role="status">{notice}</p>}
      </section>
    </div>,
    document.body
  );
}
