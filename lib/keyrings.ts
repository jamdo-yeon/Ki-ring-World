import {
  DEFAULT_WORLD,
  normalizeAvatar,
  type AvatarConfig,
  type Background,
  type Theme,
  type WorldData,
} from "@/app/world-data";

export type WorldMode = "owner" | "visitor";

export type Keyring = {
  id: string;
  public_id: string;
  owner_id: string | null;
  created_at: string;
  claimed_at: string | null;
};

export type KeyringProfile = {
  id: string;
  keyring_id: string;
  display_name: string;
  bio: string;
  currently: string;
  status: string;
  profile_tags: WorldData["profile"]["tags"];
  theme: Theme;
  background: Background;
  avatar_config: AvatarConfig;
  bgm_title: string;
  bgm_artist: string;
  bgm_cover: string;
  bgm_link: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export function profileToWorld(profile: KeyringProfile): WorldData {
  const world = structuredClone(DEFAULT_WORLD);
  world.profile.username = profile.display_name;
  world.profile.bio = profile.bio;
  world.profile.currently = profile.currently;
  world.profile.status = profile.status;
  world.profile.tags = profile.profile_tags;
  world.profile.avatar = normalizeAvatar(profile.avatar_config);
  world.theme = profile.theme;
  world.background = profile.background;
  world.music.title = profile.bgm_title;
  world.music.artist = profile.bgm_artist;
  world.music.cover = profile.bgm_cover;
  world.music.listenUrl = profile.bgm_link;
  return world;
}

export function worldToProfileUpdate(world: WorldData) {
  return {
    display_name: world.profile.username.trim() || "myworld.exe",
    bio: world.profile.bio.trim() || "welcome to my little world ♡",
    currently: world.profile.currently,
    status: world.profile.status,
    profile_tags: world.profile.tags,
    theme: world.theme,
    background: world.background,
    avatar_config: world.profile.avatar,
    bgm_title: world.music.title,
    bgm_artist: world.music.artist,
    bgm_cover: world.music.cover,
    bgm_link: world.music.listenUrl,
    updated_at: new Date().toISOString(),
  };
}
