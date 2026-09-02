"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  GUESTBOOK_ENTRY_FIELDS,
  type ServerGuestbookEntry,
} from "@/lib/guestbook";

export function ServerGuestbook({
  keyringId,
  userId,
  isOwner,
  initialEntries,
  initialError,
}: {
  keyringId: string;
  userId: string | null;
  isOwner: boolean;
  initialEntries: ServerGuestbookEntry[];
  initialError?: string;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [visitorName, setVisitorName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState(initialError ?? "");
  const [success, setSuccess] = useState("");

  async function refreshEntries() {
    const supabase = createClient();
    if (!supabase) {
      setError("Guestbook connection is not configured.");
      return;
    }

    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("guestbook_entries")
      .select(GUESTBOOK_ENTRY_FIELDS)
      .eq("keyring_id", keyringId)
      .order("created_at", { ascending: false });
    setLoading(false);

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setEntries((data ?? []) as ServerGuestbookEntry[]);
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = visitorName.trim();
    const note = message.trim();

    if (!name || !note) {
      setError("Please add your name and a little note.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Guestbook connection is not configured.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    const { data, error: submitError } = await supabase
      .from("guestbook_entries")
      .insert({
        keyring_id: keyringId,
        visitor_name: name,
        message: note,
        author_user_id: userId,
      })
      .select(GUESTBOOK_ENTRY_FIELDS)
      .single();
    setSubmitting(false);

    if (submitError) {
      setError(submitError.message);
      return;
    }

    setEntries((current) => [data as ServerGuestbookEntry, ...current]);
    setMessage("");
    setSuccess("Your note is in the guestbook ♡");
  }

  async function deleteEntry(id: string) {
    const supabase = createClient();
    if (!supabase) {
      setError("Guestbook connection is not configured.");
      return;
    }

    setDeletingId(id);
    setError("");
    setSuccess("");
    const { data, error: deleteError } = await supabase
      .from("guestbook_entries")
      .delete()
      .eq("id", id)
      .eq("keyring_id", keyringId)
      .select("id")
      .maybeSingle();
    setDeletingId(null);

    if (deleteError || !data) {
      setError(deleteError?.message ?? "This note could not be deleted.");
      return;
    }

    setEntries((current) => current.filter((entry) => entry.id !== id));
    setSuccess("Note removed ♡");
  }

  return (
    <div className="window guestbookWindow serverGuestbookWindow">
      <div className="titleBar">
        <span>guestbook.exe</span>
        <span className="windowButtons" aria-hidden="true"><span>_</span><span>□</span><span>×</span></span>
      </div>

      <div className="windowContent guestbookContent">
        <div className="serverGuestbookHeading">
          <p className="guestbookIntro">Guestbook ♡</p>
          <button type="button" disabled={loading} onClick={refreshEntries}>
            {loading ? "checking..." : "refresh notes"}
          </button>
        </div>

        <form className="memoryComposer" onSubmit={submitEntry}>
          <label>
            your name
            <input
              value={visitorName}
              maxLength={30}
              required
              placeholder="internet friend"
              onChange={(event) => setVisitorName(event.target.value)}
            />
          </label>

          <label>
            leave a little note...
            <textarea
              rows={3}
              value={message}
              maxLength={300}
              required
              placeholder="this is so cute!! ♡"
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>

          <button type="submit" disabled={submitting || !visitorName.trim() || !message.trim()}>
            {submitting ? "leaving note..." : "leave a note ♡"}
          </button>
        </form>

        {error && <p className="guestbookFeedback guestbookError" role="alert">{error}</p>}
        {success && <p className="guestbookFeedback guestbookSuccess" role="status">{success}</p>}

        <div className="guestbookEntries">
          {loading && entries.length === 0 && <p className="emptyCapsule">loading sweet notes...</p>}
          {!loading && entries.length === 0 && (
            <p className="emptyCapsule">No notes yet...<br />leave the first one ♡</p>
          )}

          {entries.map((entry, index) => (
            <article className="guestbookEntry serverGuestbookEntry" key={entry.id}>
              <div className="guestbookNumber">NO. {entries.length - index}</div>
              <div>
                <div className="serverGuestbookAuthor">
                  <strong>♡ {entry.visitor_name}</strong>
                  {isOwner && (
                    <button
                      type="button"
                      disabled={deletingId === entry.id}
                      aria-label={`Delete note from ${entry.visitor_name}`}
                      onClick={() => deleteEntry(entry.id)}
                    >
                      {deletingId === entry.id ? "..." : "×"}
                    </button>
                  )}
                </div>
                <p>{entry.message}</p>
                <span>{formatGuestbookDate(entry.created_at)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatGuestbookDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
