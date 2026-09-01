export type Tab =
  | "home"
  | "diary"
  | "photos"
  | "guestbook"
  | "capsule";

export type Theme =
  | "pink"
  | "blue"
  | "cyworld"
  | "girly";

export type Background =
  | "dots"
  | "gingham"
  | "stars"
  | "cloud";

export type WindowType =
  | "text"
  | "likes"
  | "music"
  | "note";

export type WorldWindow = {
  id: number;
  type: WindowType;
  title: string;
  content: string;
};

export type ProfileTag = {
  id: number;
  icon: string;
  label: string;
};

export type MusicData = {
  title: string;
  artist: string;
  albumArtworkUrl: string;
  cover: string;
  listenUrl: string;
};

export type AvatarConfig = {
  skin: string;
  hair: string;
  face: string;
  clothes: string;
  accessory: string;
  background: string;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "peach",
  hair: "bob-pink",
  face: "sweet",
  clothes: "baby-tee",
  accessory: "star-clips",
  background: "sky",
};

export function normalizeAvatar(
  value: unknown
): AvatarConfig {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_AVATAR };
  }

  const avatar = value as Partial<AvatarConfig>;

  return {
    skin: avatar.skin || DEFAULT_AVATAR.skin,
    hair: avatar.hair || DEFAULT_AVATAR.hair,
    face: avatar.face || DEFAULT_AVATAR.face,
    clothes: avatar.clothes || DEFAULT_AVATAR.clothes,
    accessory:
      avatar.accessory ?? DEFAULT_AVATAR.accessory,
    background:
      avatar.background ?? DEFAULT_AVATAR.background,
  };
}

export type DiaryEntry = {
  id: number;
  date: string;
  text: string;
};

export type MemoryPhoto = {
  id: number;
  image: string;
  date: string;
  caption: string;
};

export type GuestbookEntry = {
  id: number;
  visitorName: string;
  message: string;
  date: string;
};

export type WorldSnapshot = {
  version: 2;
  profile: {
    username: string;
    avatar: AvatarConfig;
    bio: string;
    status: string;
    currently: string;
    tags: ProfileTag[];
  };
  music: MusicData;
  theme: Theme;
  background: Background;
  windows: WorldWindow[];
  diary: DiaryEntry[];
  photos: MemoryPhoto[];
  guestbook: GuestbookEntry[];
};

export type Capsule = {
  id: number;
  date: string;
  title: string;
  snapshot: WorldSnapshot;
};

export type WorldData = WorldSnapshot & {
  capsules: Capsule[];
};

export const TAG_ICONS = [
  "♡",
  "☆",
  "♫",
  "✿",
  "☁",
  "☕",
  "☻",
  "⌨",
  "◇",
  "☾",
  "✦",
  "☼",
  "☂",
] as const;

export const DEFAULT_WORLD: WorldData = {
  version: 2,
  profile: {
    username: "doyeon.exe",
    avatar: { ...DEFAULT_AVATAR },
    bio: "building cute things with tech ♡",
    status: "online",
    currently: "currently building Ki-ring World ♡",
    tags: [
      { id: 1, icon: "♡", label: "matcha" },
      { id: 2, icon: "♫", label: "music" },
      { id: 3, icon: "⌨", label: "tech" },
      { id: 4, icon: "☆", label: "y2k" },
    ],
  },
  music: {
    title: "favorite song",
    artist: "my favorite artist",
    albumArtworkUrl: "",
    // Empty uses the built-in retro CD artwork. This string can later hold
    // either a hosted URL or an uploaded image source from a storage adapter.
    cover: "",
    listenUrl: "",
  },
  theme: "pink",
  background: "dots",
  windows: [
    {
      id: 1,
      type: "text",
      title: "currently.exe",
      content: "making my little corner of the internet ♡",
    },
  ],
  diary: [
    {
      id: 1,
      date: "2026-08-28",
      text: "today I started building Ki-ring World.\n\nmaybe future me will tap this charm and remember exactly who I was ♡",
    },
  ],
  photos: [
    { id: 1, image: "📷", date: "2026-08-28", caption: "camera day" },
    { id: 2, image: "🍓", date: "2026-08-28", caption: "sweet memory" },
    { id: 3, image: "💿", date: "2026-08-28", caption: "favorite song" },
    { id: 4, image: "🎀", date: "2026-08-28", caption: "little things" },
    { id: 5, image: "🫧", date: "2026-08-28", caption: "dreamy day" },
    { id: 6, image: "⭐", date: "2026-08-28", caption: "wish list" },
  ],
  guestbook: [],
  capsules: [],
};

export function cloneSnapshot(
  world: WorldData
): WorldSnapshot {
  return JSON.parse(
    JSON.stringify({
      version: 2,
      profile: world.profile,
      music: world.music,
      theme: world.theme,
      background: world.background,
      windows: world.windows,
      diary: world.diary,
      photos: world.photos,
      guestbook: world.guestbook,
    })
  ) as WorldSnapshot;
}

type LegacyWorld = {
  name?: string;
  bio?: string;
  avatar?: string;
  theme?: Theme;
  background?: Background;
  windows?: WorldWindow[];
  diaryEntries?: Array<{
    id: number;
    date: string;
    paragraphs: string[];
  }>;
  photos?: Array<{
    id: number;
    emoji: string;
    caption: string;
  }>;
};

type LegacyCapsule = {
  id: number;
  date: string;
  snapshot?: LegacyWorld & {
    version?: 1;
  };
};

function migrateLegacySnapshot(
  legacy: LegacyWorld
): WorldSnapshot {
  const base = structuredClone(DEFAULT_WORLD);
  const legacyMusic = legacy.windows?.find(
    (item) => item.type === "music"
  );

  return {
    version: 2,
    profile: {
      ...base.profile,
      username:
        legacy.name ?? base.profile.username,
      bio: legacy.bio ?? base.profile.bio,
      avatar: normalizeAvatar(legacy.avatar),
    },
    music: {
      ...base.music,
      title:
        legacyMusic?.content ??
        base.music.title,
    },
    theme: legacy.theme ?? base.theme,
    background:
      legacy.background ?? base.background,
    windows:
      legacy.windows?.filter(
        (item) => item.type !== "music"
      ) ?? base.windows,
    diary:
      legacy.diaryEntries?.map((entry) => ({
        id: entry.id,
        date: entry.date.replaceAll(".", "-"),
        text: entry.paragraphs.join("\n\n"),
      })) ?? base.diary,
    photos:
      legacy.photos?.map((photo) => ({
        id: photo.id,
        image: photo.emoji,
        date: "",
        caption: photo.caption,
      })) ?? base.photos,
    guestbook: [],
  };
}

export function loadWorldData(): WorldData {
  const fallback = structuredClone(DEFAULT_WORLD);

  try {
    const stored = localStorage.getItem("kiring-world-v2");

    if (stored) {
      const parsed = JSON.parse(stored) as WorldData;
      const savedMusic = parsed.music as
        MusicData & {
          audioUrl?: string;
          musicLink?: string;
          spotifyUrl?: string;
          spotifyTrackId?: string;
        };
      const legacyAudioUrl = savedMusic.audioUrl;
      const legacyMusicLink = savedMusic.musicLink;
      const legacySpotifyUrl = savedMusic.spotifyUrl;
      const savedListenUrl =
        savedMusic.listenUrl ??
        legacySpotifyUrl ??
        legacyMusicLink ??
        legacyAudioUrl ??
        "";
      return {
        ...fallback,
        ...parsed,
        profile: {
          ...fallback.profile,
          ...parsed.profile,
          avatar: normalizeAvatar(parsed.profile?.avatar),
        },
        music: {
          ...fallback.music,
          title: savedMusic.title,
          artist: savedMusic.artist,
          cover:
            savedMusic?.cover === "💿"
              ? ""
              : savedMusic?.cover ?? "",
          albumArtworkUrl:
            savedMusic.albumArtworkUrl ?? "",
          listenUrl: savedListenUrl,
        },
        windows: (
          parsed.windows ?? fallback.windows
        ).filter(
          (item) => item.type !== "music"
        ),
        capsules: (parsed.capsules ?? []).map(
          (capsule) => ({
            ...capsule,
            snapshot: {
              ...capsule.snapshot,
              profile: {
                ...fallback.profile,
                ...capsule.snapshot.profile,
                avatar: normalizeAvatar(
                  capsule.snapshot.profile.avatar
                ),
              },
            },
          })
        ),
      };
    }

    const legacyRaw = localStorage.getItem("kiring-world");
    const legacyCapsules = localStorage.getItem("kiring-capsules");

    if (!legacyRaw) {
      return fallback;
    }

    const legacy = JSON.parse(legacyRaw) as LegacyWorld;
    fallback.profile.username = legacy.name ?? fallback.profile.username;
    fallback.profile.bio = legacy.bio ?? fallback.profile.bio;
    fallback.profile.avatar = normalizeAvatar(legacy.avatar);
    fallback.theme = legacy.theme ?? fallback.theme;
    fallback.background = legacy.background ?? fallback.background;
    fallback.windows = (
      legacy.windows ?? fallback.windows
    ).filter(
      (item) => item.type !== "music"
    );
    fallback.diary = legacy.diaryEntries?.map((entry) => ({
      id: entry.id,
      date: entry.date.replaceAll(".", "-"),
      text: entry.paragraphs.join("\n\n"),
    })) ?? fallback.diary;
    fallback.photos = legacy.photos?.map((photo) => ({
      id: photo.id,
      image: photo.emoji,
      date: "",
      caption: photo.caption,
    })) ?? fallback.photos;

    if (legacyCapsules) {
      const capsules = JSON.parse(
        legacyCapsules
      ) as LegacyCapsule[];

      fallback.capsules = capsules
        .filter(
          (capsule) => capsule.snapshot
        )
        .map((capsule, index) => ({
          id: capsule.id,
          date: capsule.date,
          title: `Archived world ${
            capsules.length - index
          }`,
          snapshot: migrateLegacySnapshot(
            capsule.snapshot ?? {}
          ),
        }));
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function saveWorldData(world: WorldData) {
  try {
    localStorage.setItem("kiring-world-v2", JSON.stringify(world));
  } catch {
    // Local image previews can exceed a browser's storage quota. The in-memory
    // world remains usable; a backend can replace this adapter later.
  }
}
