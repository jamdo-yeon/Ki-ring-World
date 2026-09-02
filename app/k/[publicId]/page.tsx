import { createClient } from "@/lib/supabase/server";
import {
  getMissingSupabaseEnvVars,
  getSupabaseConfig,
} from "@/lib/supabase/config";
import type { Keyring, KeyringProfile } from "@/lib/keyrings";
import {
  GUESTBOOK_ENTRY_FIELDS,
  type ServerGuestbookEntry,
} from "@/lib/guestbook";
import { KeyringExperience } from "./keyring-experience";
import { normalizeVisitCounts } from "@/lib/visits";

export const dynamic = "force-dynamic";

export default async function KeyringPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ claim?: string }>;
}) {
  const { publicId } = await params;
  const { claim } = await searchParams;

  const missingEnvVars = getMissingSupabaseEnvVars();

  if (missingEnvVars.length > 0 || !getSupabaseConfig()) {
    return (
      <KeyringExperience
        publicId={publicId}
        state="not-configured"
        missingEnvVars={missingEnvVars}
      />
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return (
      <KeyringExperience
        publicId={publicId}
        state="not-configured"
        missingEnvVars={getMissingSupabaseEnvVars()}
      />
    );
  }

  const [{ data: keyringData, error: keyringError }, { data: claimsData }] =
    await Promise.all([
      supabase.from("keyrings").select("*").eq("public_id", publicId).maybeSingle(),
      supabase.auth.getClaims(),
    ]);

  if (keyringError) {
    return (
      <KeyringExperience
        publicId={publicId}
        state="error"
        message={keyringError.message}
      />
    );
  }

  if (!keyringData) {
    return <KeyringExperience publicId={publicId} state="not-found" />;
  }

  const keyring = keyringData as Keyring;
  const userId = claimsData?.claims?.sub ?? null;

  if (!keyring.owner_id) {
    return (
      <KeyringExperience
        publicId={publicId}
        state="unclaimed"
        keyring={keyring}
        initialUserId={userId}
        autoClaim={claim === "1"}
      />
    );
  }

  const [
    { data: profileData, error: profileError },
    { data: guestbookData, error: guestbookError },
    { data: visitCountData },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("keyring_id", keyring.id).maybeSingle(),
    supabase
      .from("guestbook_entries")
      .select(GUESTBOOK_ENTRY_FIELDS)
      .eq("keyring_id", keyring.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_keyring_visit_counts", {
      target_public_id: publicId,
    }),
  ]);

  if (profileError) {
    return (
      <KeyringExperience
        publicId={publicId}
        state="error"
        message={profileError.message}
      />
    );
  }

  if (!profileData) {
    return (
      <KeyringExperience
        publicId={publicId}
        state="private"
        keyring={keyring}
        initialUserId={userId}
      />
    );
  }

  return (
    <KeyringExperience
      publicId={publicId}
      state="world"
      keyring={keyring}
      profile={profileData as KeyringProfile}
      initialGuestbookEntries={(guestbookData ?? []) as ServerGuestbookEntry[]}
      initialGuestbookError={guestbookError?.message}
      initialVisitCounts={normalizeVisitCounts(visitCountData)}
      initialUserId={userId}
    />
  );
}
