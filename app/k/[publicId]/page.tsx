import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Keyring, KeyringProfile } from "@/lib/keyrings";
import { KeyringExperience } from "./keyring-experience";

export const dynamic = "force-dynamic";

export default async function KeyringPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  if (!getSupabaseConfig()) {
    return <KeyringExperience publicId={publicId} state="not-configured" />;
  }

  const supabase = await createClient();
  if (!supabase) {
    return <KeyringExperience publicId={publicId} state="not-configured" />;
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
      />
    );
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("keyring_id", keyring.id)
    .maybeSingle();

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
      initialUserId={userId}
    />
  );
}
