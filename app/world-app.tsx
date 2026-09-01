"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  cloneSnapshot,
  DEFAULT_WORLD,
  loadWorldData,
  saveWorldData,
  TAG_ICONS,
  type AvatarConfig,
  type Background,
  type Capsule,
  type DiaryEntry,
  type GuestbookEntry,
  type MemoryPhoto,
  type MusicData,
  type ProfileTag,
  type Tab,
  type Theme,
  type WindowType,
  type WorldData,
  type WorldSnapshot,
  type WorldWindow,
} from "./world-data";
import type { WorldMode } from "@/lib/keyrings";

export function WorldApp({
  initialWorld,
  mode = "owner",
  onSave,
  localStorageKey,
}: {
  initialWorld?: WorldData;
  mode?: WorldMode;
  onSave?: (world: WorldData) => Promise<void>;
  localStorageKey?: string;
} = {}) {
  const [activeTab, setActiveTab] =
    useState<Tab>("home");

  const [customizing, setCustomizing] =
    useState(false);

  const [world, setWorld] =
    useState<WorldData>(() =>
      initialWorld
        ? structuredClone(initialWorld)
        : DEFAULT_WORLD
    );

  const [hydrated, setHydrated] =
    useState(false);

  const [saveNotice, setSaveNotice] =
    useState("");

  const [viewingCapsuleId, setViewingCapsuleId] =
    useState<number | null>(null);

  const [capsuleTitle, setCapsuleTitle] =
    useState("");

  const {
    profile,
    music,
    theme,
    background,
    windows,
    diary: diaryEntries,
    photos,
    guestbook,
    capsules,
  } = world;

  const name = profile.username;
  const bio = profile.bio;
  const avatar = profile.avatar;

  useEffect(() => {
    function handleButtonSound(
      event: MouseEvent
    ) {
      const target =
        event.target as HTMLElement;

      const button =
        target.closest("button");

      if (
        !button ||
        button.disabled
      ) {
        return;
      }

      playUiSound(
        button.dataset.sound ===
          "chime"
          ? "chime"
          : "click"
      );
    }

    document.addEventListener(
      "click",
      handleButtonSound
    );

    return () =>
      document.removeEventListener(
        "click",
        handleButtonSound
      );
  }, []);

  /* =========================
     LOAD SAVED WORLD
  ========================= */

  useEffect(() => {
    if (initialWorld) {
      const frame = requestAnimationFrame(() => {
        if (localStorageKey) {
          try {
            const raw = localStorage.getItem(localStorageKey);
            if (raw) {
              const local = JSON.parse(raw) as WorldData;
              setWorld((serverWorld) => ({
                ...serverWorld,
                windows: local.windows ?? serverWorld.windows,
                diary: local.diary ?? serverWorld.diary,
                photos: local.photos ?? serverWorld.photos,
                guestbook: local.guestbook ?? serverWorld.guestbook,
                capsules: local.capsules ?? serverWorld.capsules,
              }));
            }
          } catch {
            // A malformed prototype cache must not block the server profile.
          }
        }
        setHydrated(true);
      });
      return () => cancelAnimationFrame(frame);
    }

    const frame =
      requestAnimationFrame(() => {
        setWorld(loadWorldData());
        setHydrated(true);
      });

    return () =>
      cancelAnimationFrame(frame);
  }, [initialWorld, localStorageKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (initialWorld && localStorageKey) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(world));
      } catch {
        // Large local photo previews may exceed storage quota.
      }
    } else if (!initialWorld) {
      saveWorldData(world);
    }
  }, [hydrated, initialWorld, localStorageKey, world]);

  /* =========================
     SAVE WORLD
  ========================= */

  async function saveWorld() {
    const normalized: WorldData = {
      ...world,
      profile: {
        ...world.profile,
        username:
          world.profile.username.trim() ||
          "myworld.exe",
        bio:
          world.profile.bio.trim() ||
          "welcome to my little world ♡",
      },
    };

    setWorld(normalized);
    setSaveNotice("");

    try {
      await onSave?.(normalized);
      setSaveNotice(onSave ? "Saved to your Ki-ring ♡" : "Saved locally ♡");
    } catch (error) {
      setSaveNotice(error instanceof Error ? error.message : "Could not save this world.");
      return;
    }

    setCustomizing(false);
  }

  function setName(value: string) {
    setWorld((current) => ({
      ...current,
      profile: {
        ...current.profile,
        username: value,
      },
    }));
  }

  function setBio(value: string) {
    setWorld((current) => ({
      ...current,
      profile: {
        ...current.profile,
        bio: value,
      },
    }));
  }

  function setTheme(value: Theme) {
    setWorld((current) => ({
      ...current,
      theme: value,
    }));
  }

  function setBackground(value: Background) {
    setWorld((current) => ({
      ...current,
      background: value,
    }));
  }

  /* =========================
     ADD WINDOW
  ========================= */

  function addWindow(
    type: WindowType
  ) {
    let title =
      "new_window.exe";

    let content =
      "write something here ♡";

    if (type === "likes") {
      title = "likes.exe";

      content =
        "matcha\nbows\nmusic\ncute tech";
    }

    if (type === "music") {
      title =
        "music_player.exe";

      content =
        "my favorite song.mp3";
    }

    if (type === "note") {
      title = "note.txt";

      content =
        "a tiny note from my world ♡";
    }

    const newWindow: WorldWindow =
      {
        id: Date.now(),
        type,
        title,
        content,
      };

    setWorld((current) => ({
      ...current,
      windows: [
        ...current.windows,
        newWindow,
      ],
    }));
  }

  /* =========================
     UPDATE WINDOW
  ========================= */

  function updateWindow(
    id: number,
    key: "title" | "content",
    value: string
  ) {
    setWorld((current) => ({
      ...current,
      windows: current.windows.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item
      ),
    }));
  }

  /* =========================
     DELETE WINDOW
  ========================= */

  function deleteWindow(
    id: number
  ) {
    setWorld((current) => ({
      ...current,
      windows: current.windows.filter(
        (item) =>
          item.id !== id
      ),
    }));
  }

  /* =========================
     MOVE WINDOW
  ========================= */

  function moveWindow(
    index: number,
    direction:
      | "up"
      | "down"
  ) {
    const newWindows = [
      ...windows,
    ];

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        newWindows.length
    ) {
      return;
    }

    const current =
      newWindows[index];

    newWindows[index] =
      newWindows[
        targetIndex
      ];

    newWindows[
      targetIndex
    ] = current;

    setWorld((currentWorld) => ({
      ...currentWorld,
      windows: newWindows,
    }));
  }

  /* =========================
     CAPSULE
  ========================= */

  function createCapsule() {
    const date =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }
      ).format(new Date());

    const capsule: Capsule = {
      id: Date.now(),
      date,
      title:
        capsuleTitle.trim() ||
        `${name}'s world`,
      snapshot: cloneSnapshot(world),
    };

    setWorld((current) => ({
      ...current,
      capsules: [
        capsule,
        ...current.capsules,
      ],
    }));

    setViewingCapsuleId(
      capsule.id
    );
    setCapsuleTitle("");
  }

  return (
    <main
      className={`
        page
        theme-${theme}
        background-${background}
        ${mode === "visitor" ? "visitorMode" : "ownerMode"}
      `}
    >
      <div className="phone">

        {/* ======================
            DESKTOP
        ====================== */}

        <section
          className={`
            desktop
            ${
              theme === "blue"
                ? "xpDesktop"
                : ""
            }
          `}
        >
          {theme === "blue" &&
            !customizing &&
            activeTab ===
              "home" && (
              <XpDesktopDecor />
            )}

          {theme === "pink" && (
            <PinkDesktopDecor />
          )}

          <div className="contentLayer">

            {/* ======================
                MAIN PROFILE
            ====================== */}

            <div className="window mainProfileWindow">

              <WindowTitle
                title="♡ KI-RING WORLD"
              />

              <div className="profileHeader">

                <div className="avatar">
                  <AvatarStack avatar={avatar} />
                </div>

                <div className="profileInfo">

                  <div className="nameRow">

                    <div>
                      <h1>
                        <KitschLetters
                          text={name}
                        />
                      </h1>

                      <p className="visitor">
                        {profile.status.toUpperCase()}
                        {" · "}TODAY 12 · TOTAL 2,406
                      </p>
                    </div>

                    {mode === "owner" && <button
                      className="smallButton"
                      type="button"
                      onClick={() =>
                        setCustomizing(
                          true
                        )
                      }
                    >
                      Customize my world ♡
                    </button>}

                  </div>

                  <p className="bio">
                    {bio}
                  </p>

                  <p className="currentlyLine">
                    <strong>Currently</strong>
                    {profile.currently}
                  </p>

                </div>
              </div>

              <div className="tags">
                {profile.tags
                  .slice(0, 6)
                  .map((tag) => (
                    <span key={tag.id}>
                      {tag.icon}{" "}
                      {tag.label}
                    </span>
                  ))}
              </div>

              {saveNotice && (
                <p className="worldSaveNotice" role="status">{saveNotice}</p>
              )}

            </div>

            {/* ======================
                CUSTOMIZE
            ====================== */}

            {mode === "owner" && customizing && (
              <CustomizePanel
                name={name}
                setName={setName}

                bio={bio}
                setBio={setBio}

                theme={theme}
                setTheme={setTheme}

                background={
                  background
                }
                setBackground={
                  setBackground
                }

                windows={
                  windows
                }

                addWindow={
                  addWindow
                }

                updateWindow={
                  updateWindow
                }

                deleteWindow={
                  deleteWindow
                }

                moveWindow={
                  moveWindow
                }

                saveWorld={
                  saveWorld
                }

                close={() =>
                  setCustomizing(
                    false
                  )
                }
                world={world}
                setWorld={setWorld}
              />
            )}

            {/* ======================
                HOME
            ====================== */}

            {!customizing &&
              activeTab ===
                "home" && (
                <>
                  <BgmPlayer
                    music={music}
                  />

                  {windows.map(
                    (item) => (
                      <WorldWindowView
                        key={item.id}
                        window={item}
                      />
                    )
                  )}
                </>
              )}

            {/* ======================
                DIARY
            ====================== */}

            {!customizing &&
              activeTab ===
                "diary" && (
                <DiaryPanel
                  entries={diaryEntries}
                  setWorld={setWorld}
                  editable={mode === "owner"}
                />
              )}

            {/* ======================
                PHOTOS
            ====================== */}

            {!customizing &&
              activeTab ===
                "photos" && (
                <PhotosPanel
                  photos={photos}
                  setWorld={setWorld}
                  editable={mode === "owner"}
                />
              )}

            {/* ======================
                GUESTBOOK
            ====================== */}

            {!customizing &&
              activeTab ===
                "guestbook" && (
                <GuestbookPanel
                  entries={guestbook}
                  setWorld={setWorld}
                />
              )}

            {/* ======================
                CAPSULE
            ====================== */}

            {!customizing &&
              activeTab ===
                "capsule" && (
                <div className="window">

                  <WindowTitle
                    title="time_capsule.exe"
                  />

                  <div className="windowContent">

                    {mode === "owner" && <><p className="capsuleDescription">
                      Save this exact
                      version of your
                      world for future
                      you.
                    </p>

                    <label className="capsuleTitleField">
                      Capsule title (optional)
                      <input
                        value={capsuleTitle}
                        maxLength={40}
                        placeholder="Summer 2026 ♡"
                        onChange={(event) =>
                          setCapsuleTitle(
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <button
                      className="mainButton"
                      type="button"
                      data-sound="chime"
                      onClick={
                        createCapsule
                      }
                    >
                      Freeze this
                      moment ♡
                    </button>
                    </>}

                    <div className="capsuleList">

                      {capsules.length ===
                        0 && (
                        <p className="emptyCapsule">
                          no capsules
                          yet...
                        </p>
                      )}

                      {capsules.map(
                        (
                          capsule,
                          index
                        ) => (
                          <div
                            className="capsule"
                            key={
                              capsule.id
                            }
                          >

                            <strong>
                              ♡ {capsule.title ||
                                `Capsule ${
                                  capsules.length -
                                  index
                                }`}
                            </strong>

                            <span>
                              {
                                capsule.date
                              }
                            </span>

                            <p>
                              {
                                capsule.snapshot.profile.username
                              }
                            </p>

                            <button
                              className="capsuleViewButton"
                              type="button"
                              onClick={() =>
                                setViewingCapsuleId(
                                  (current) =>
                                    current ===
                                    capsule.id
                                      ? null
                                      : capsule.id
                                )
                              }
                            >
                              {viewingCapsuleId ===
                              capsule.id
                                ? "Close archive"
                                : "View archive"}
                            </button>

                            {viewingCapsuleId ===
                              capsule.id && (
                              <CapsuleArchive
                                snapshot={
                                  capsule.snapshot
                                }
                              />
                            )}

                          </div>
                        )
                      )}

                    </div>

                  </div>
                </div>
              )}

          </div>
        </section>

        {/* ======================
            NAVIGATION
        ====================== */}

        {!customizing && (
          <nav className="nav">

            <NavButton
              icon="⌂"
              label="Home"
              active={
                activeTab ===
                "home"
              }
              onClick={() =>
                setActiveTab(
                  "home"
                )
              }
            />

            <NavButton
              icon="▤"
              label="Diary"
              active={
                activeTab ===
                "diary"
              }
              onClick={() =>
                setActiveTab(
                  "diary"
                )
              }
            />

            <NavButton
              icon="▧"
              label="Photos"
              active={
                activeTab ===
                "photos"
              }
              onClick={() =>
                setActiveTab(
                  "photos"
                )
              }
            />

            <NavButton
              icon="♡"
              label="Guestbook"
              active={
                activeTab ===
                "guestbook"
              }
              onClick={() =>
                setActiveTab(
                  "guestbook"
                )
              }
            />

            <NavButton
              icon="☆"
              label="Capsule"
              active={
                activeTab ===
                "capsule"
              }
              onClick={() =>
                setActiveTab(
                  "capsule"
                )
              }
            />

          </nav>
        )}

        {/* ======================
            STATUS BAR
        ====================== */}

        <footer className="statusBar">

          <span className="startArea">
            <span className="startIcon">
              ▣
            </span>

            start
          </span>

          <span className="taskName">
            ki-ring.world
          </span>

          <span className="statusRight">
            ♡ NFC
          </span>

        </footer>

      </div>
    </main>
  );
}

function CapsuleArchive({
  snapshot,
}: {
  snapshot: WorldSnapshot;
}) {
  return (
    <div className="capsuleArchive">
      <div className="archiveProfile">
        <span className="archiveAvatar">
          <AvatarStack
            avatar={snapshot.profile.avatar}
          />
        </span>

        <div>
          <strong>
            {snapshot.profile.username}
          </strong>
          <p>{snapshot.profile.bio}</p>
        </div>
      </div>

      <div className="archiveCurrently">
        <strong>Currently</strong>
        <p>
          {snapshot.profile.currently}
        </p>
      </div>

      <div className="archiveTagList">
        {snapshot.profile.tags.map(
          (tag) => (
            <span key={tag.id}>
              {tag.icon} {tag.label}
            </span>
          )
        )}
      </div>

      <p className="archiveMeta">
        {snapshot.theme} theme ·{" "}
        {snapshot.background} background
      </p>

      <section className="archiveSection">
        <h3>♫ frozen BGM</h3>
        <div className="archiveItem">
          <strong>
            ♫{" "}
            {snapshot.music.title}
          </strong>
          <p>{snapshot.music.artist}</p>
        </div>
      </section>

      <section className="archiveSection">
        <h3>♡ saved windows</h3>
        {snapshot.windows.map(
          (item) => (
            <div
              className="archiveItem"
              key={item.id}
            >
              <strong>
                {item.title}
              </strong>
              <p>
                {item.content}
              </p>
            </div>
          )
        )}
      </section>

      <section className="archiveSection">
        <h3>▤ diary memories</h3>
        {snapshot.diary.map(
          (entry) => (
            <div
              className="archiveItem"
              key={entry.id}
            >
              <strong>
                {entry.date}
              </strong>
              <p>{entry.text}</p>
            </div>
          )
        )}
      </section>

      <section className="archiveSection">
        <h3>▧ photo memories</h3>
        <div className="archivePhotos">
          {snapshot.photos.map(
            (photo) => (
              <div key={photo.id}>
                <span>
                  {photo.image.startsWith(
                    "data:"
                  ) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.image}
                      alt=""
                    />
                  ) : (
                    photo.image
                  )}
                </span>
                <small>
                  {photo.caption}
                </small>
              </div>
            )
          )}
        </div>
      </section>

      <section className="archiveSection">
        <h3>♡ guestbook traces</h3>
        {snapshot.guestbook.length ===
          0 ? (
          <p>no notes yet...</p>
        ) : (
          snapshot.guestbook.map(
            (entry) => (
              <div
                className="archiveItem"
                key={entry.id}
              >
                <strong>
                  {entry.visitorName}
                </strong>
                <p>{entry.message}</p>
                <small>{entry.date}</small>
              </div>
            )
          )
        )}
      </section>
    </div>
  );
}

function isImageSource(source: string) {
  return (
    source.startsWith("data:image/") ||
    source.startsWith("blob:") ||
    source.startsWith("http://") ||
    source.startsWith("https://")
  );
}

type AvatarCategory = keyof AvatarConfig;

const AVATAR_CATEGORIES: AvatarCategory[] = [
  "skin",
  "hair",
  "face",
  "clothes",
  "accessory",
  "background",
];

const AVATAR_CATEGORY_LABELS: Record<AvatarCategory, string> = {
  skin: "skin",
  hair: "hair",
  face: "face",
  clothes: "clothes",
  accessory: "extras",
  background: "bg",
};

const AVATAR_OPTIONS: Record<
  AvatarCategory,
  Array<{ id: string; label: string }>
> = {
  skin: [
    { id: "peach", label: "peach" },
    { id: "tan", label: "sun-kissed" },
  ],
  hair: [
    { id: "bob-pink", label: "pink bob" },
    { id: "pigtails-brown", label: "pigtails" },
    { id: "short-blue", label: "blue crop" },
  ],
  face: [
    { id: "sweet", label: "sweet" },
    { id: "wink", label: "wink" },
    { id: "sparkle", label: "sparkle" },
  ],
  clothes: [
    { id: "baby-tee", label: "baby tee" },
    { id: "sailor", label: "sailor" },
    { id: "hoodie", label: "hoodie" },
  ],
  accessory: [
    { id: "none", label: "none" },
    { id: "star-clips", label: "star clips" },
    { id: "headphones", label: "headphones" },
    { id: "angel-wings", label: "angel wings" },
  ],
  background: [
    { id: "none", label: "none" },
    { id: "sky", label: "baby sky" },
    { id: "checker", label: "checker" },
  ],
};

const AVATAR_LAYER_ORDER: AvatarCategory[] = [
  "background",
  "skin",
  "clothes",
  "face",
  "hair",
  "accessory",
];

function AvatarStack({
  avatar,
}: {
  avatar: AvatarConfig;
}) {
  return (
    <span className="avatarStack" aria-label="Layered avatar">
      {AVATAR_LAYER_ORDER.map((category) => {
        const id = avatar[category];

        if (id === "none") {
          return null;
        }

        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/avatar/${category}/${id}.svg`}
            alt=""
            aria-hidden="true"
            key={category}
          />
        );
      })}
    </span>
  );
}

function compressAlbumCover(
  file: File
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl =
      URL.createObjectURL(file);
    const image = new Image();

    image.addEventListener("load", () => {
      try {
        const sourceSize = Math.min(
          image.naturalWidth,
          image.naturalHeight
        );

        if (!sourceSize) {
          throw new Error(
            "Image has no dimensions."
          );
        }

        const outputSize = Math.min(
          500,
          sourceSize
        );
        const sourceX =
          (image.naturalWidth - sourceSize) /
          2;
        const sourceY =
          (image.naturalHeight - sourceSize) /
          2;
        const canvas =
          document.createElement("canvas");

        canvas.width = outputSize;
        canvas.height = outputSize;

        const context =
          canvas.getContext("2d");

        if (!context) {
          throw new Error(
            "Canvas is unavailable."
          );
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          outputSize,
          outputSize
        );

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              reject(
                new Error(
                  "Image compression failed."
                )
              );
              return;
            }

            const reader = new FileReader();
            reader.addEventListener(
              "load",
              () => {
                if (
                  typeof reader.result ===
                  "string"
                ) {
                  resolve(reader.result);
                } else {
                  reject(
                    new Error(
                      "Image conversion failed."
                    )
                  );
                }
              }
            );
            reader.addEventListener(
              "error",
              () => reject(reader.error)
            );
            reader.readAsDataURL(blob);
          },
          "image/jpeg",
          0.82
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    });

    image.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error("Image could not load.")
      );
    });

    image.src = objectUrl;
  });
}

function getSafeExternalLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ||
      url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function BgmPlayer({
  music,
}: {
  music: MusicData;
}) {
  const coverSource =
    music.cover || music.albumArtworkUrl;
  const coverIsImage =
    isImageSource(coverSource);
  const listenUrl =
    getSafeExternalLink(music.listenUrl);

  return (
    <div className="window bgmWindow">
      <WindowTitle title="my_bgm.exe" />

      <div className="windowContent music">
        <div className="album bgmCover">
          {coverIsImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSource}
              alt="Album cover"
            />
          ) : (
            <div
              className="defaultCdCover"
              aria-label="Default retro CD cover"
            >
              <span className="defaultCdDisc">
                <span />
              </span>
              <small>KI-RING BGM ✦</small>
            </div>
          )}
        </div>

        <div className="musicInfo">
          <p className="songTitle">
            {music.title || "untitled song"}
          </p>
          <p className="songArtist">
            {music.artist || "unknown artist"}
          </p>

          <div className="musicButtons">
            <button type="button" disabled>
              ◀
            </button>

            <button type="button" disabled>
              ▶
            </button>

            <button type="button" disabled>
              ▶▶
            </button>

            <span className="musicSourceStatus">
              profile BGM
            </span>
          </div>

          <div
            className="progress"
            aria-hidden="true"
          >
            <div />
          </div>

          {listenUrl && (
            <a
              className="listenLink"
              href={listenUrl}
              target="_blank"
              rel="noreferrer"
            >
              listen ↗
            </a>
          )}
        </div>

      </div>
    </div>
  );
}

function DiaryPanel({
  entries,
  setWorld,
  editable,
}: {
  entries: DiaryEntry[];
  setWorld: Dispatch<
    SetStateAction<WorldData>
  >;
  editable: boolean;
}) {
  const [date, setDate] = useState("");
  const [text, setText] = useState("");

  function addEntry() {
    if (!text.trim()) {
      return;
    }

    const entry: DiaryEntry = {
      id: Date.now(),
      date:
        date ||
        new Date().toISOString().slice(0, 10),
      text: text.trim(),
    };

    setWorld((current) => ({
      ...current,
      diary: [entry, ...current.diary],
    }));
    setText("");
    setDate("");
  }

  function deleteEntry(id: number) {
    setWorld((current) => ({
      ...current,
      diary: current.diary.filter(
        (entry) => entry.id !== id
      ),
    }));
  }

  return (
    <div className="window">
      <WindowTitle title="diary.txt" />

      <div className="windowContent diary">
        {editable && <div className="memoryComposer">
          <label>
            date
            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
            />
          </label>

          <label>
            today&apos;s tiny memory
            <textarea
              rows={3}
              maxLength={280}
              value={text}
              placeholder="write a little trace from today..."
              onChange={(event) =>
                setText(event.target.value)
              }
            />
          </label>

          <button
            type="button"
            disabled={!text.trim()}
            onClick={addEntry}
          >
            Save diary entry ♡
          </button>
        </div>}

        {entries.map((entry) => (
          <article
            className="diaryEntry"
            key={entry.id}
          >
            <div className="entryHeading">
              <p className="date">
                {entry.date}
              </p>
              {editable && <button
                type="button"
                aria-label="Delete diary entry"
                onClick={() =>
                  deleteEntry(entry.id)
                }
              >
                ×
              </button>}
            </div>
            <p>{entry.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function PhotosPanel({
  photos,
  setWorld,
  editable,
}: {
  photos: MemoryPhoto[];
  setWorld: Dispatch<
    SetStateAction<WorldData>
  >;
  editable: boolean;
}) {
  const [image, setImage] = useState("📷");
  const [date, setDate] = useState("");
  const [caption, setCaption] = useState("");

  function addPhoto() {
    if (!image.trim()) {
      return;
    }

    const photo: MemoryPhoto = {
      id: Date.now(),
      image: image.trim(),
      date:
        date ||
        new Date().toISOString().slice(0, 10),
      caption:
        caption.trim() || "tiny memory",
    };

    setWorld((current) => ({
      ...current,
      photos: [photo, ...current.photos],
    }));
    setImage("📷");
    setDate("");
    setCaption("");
  }

  function chooseFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
      }
    });
    reader.readAsDataURL(file);
  }

  function deletePhoto(id: number) {
    setWorld((current) => ({
      ...current,
      photos: current.photos.filter(
        (photo) => photo.id !== id
      ),
    }));
  }

  return (
    <div className="window">
      <WindowTitle title="photos.zip" />

      <div className="windowContent">
        {editable && <div className="memoryComposer photoComposer">
          <label>
            image, URL, or symbol
            <input
              value={image.startsWith("data:") ? "local preview ready ♡" : image}
              maxLength={1000}
              onChange={(event) =>
                setImage(event.target.value)
              }
            />
          </label>

          <label className="filePicker">
            Choose a local photo
            <input
              type="file"
              accept="image/*"
              onChange={chooseFile}
            />
          </label>

          <label>
            date
            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
            />
          </label>

          <label>
            caption
            <input
              value={caption}
              maxLength={80}
              placeholder="a tiny memory..."
              onChange={(event) =>
                setCaption(event.target.value)
              }
            />
          </label>

          <button
            type="button"
            onClick={addPhoto}
          >
            Add memory ✦
          </button>
        </div>}

        <div className="photoGrid memoryPhotoGrid">
          {photos.map((photo) => (
            <figure
              className="photoMemory"
              key={photo.id}
            >
              <Photo image={photo.image} />
              <figcaption>
                <strong>{photo.caption}</strong>
                <span>{photo.date}</span>
              </figcaption>
              {editable && <button
                type="button"
                aria-label="Delete photo"
                onClick={() =>
                  deletePhoto(photo.id)
                }
              >
                ×
              </button>}
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

function GuestbookPanel({
  entries,
  setWorld,
}: {
  entries: GuestbookEntry[];
  setWorld: Dispatch<
    SetStateAction<WorldData>
  >;
}) {
  const [visitorName, setVisitorName] =
    useState("");
  const [message, setMessage] =
    useState("");

  function leaveNote() {
    if (
      !visitorName.trim() ||
      !message.trim()
    ) {
      return;
    }

    const entry: GuestbookEntry = {
      id: Date.now(),
      visitorName: visitorName.trim(),
      message: message.trim(),
      date: new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(new Date()),
    };

    setWorld((current) => ({
      ...current,
      guestbook: [
        entry,
        ...current.guestbook,
      ],
    }));
    setVisitorName("");
    setMessage("");
  }

  return (
    <div className="window guestbookWindow">
      <WindowTitle title="guestbook.exe" />

      <div className="windowContent guestbookContent">
        <p className="guestbookIntro">
          leave a note ♡
        </p>

        <div className="memoryComposer">
          <label>
            your name
            <input
              value={visitorName}
              maxLength={30}
              placeholder="internet friend"
              onChange={(event) =>
                setVisitorName(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            message
            <textarea
              rows={3}
              value={message}
              maxLength={180}
              placeholder="hii ♡ it was nice meeting you today"
              onChange={(event) =>
                setMessage(event.target.value)
              }
            />
          </label>

          <button
            type="button"
            disabled={
              !visitorName.trim() ||
              !message.trim()
            }
            onClick={leaveNote}
          >
            Sign guestbook ♡
          </button>
        </div>

        <div className="guestbookEntries">
          {entries.length === 0 && (
            <p className="emptyCapsule">
              be the first to leave a trace...
            </p>
          )}

          {entries.map((entry, index) => (
            <article
              className="guestbookEntry"
              key={entry.id}
            >
              <div className="guestbookNumber">
                NO. {entries.length - index}
              </div>
              <div>
                <strong>
                  {entry.visitorName}
                </strong>
                <span>{entry.date}</span>
                <p>{entry.message}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================================
   CUSTOMIZE PANEL
=================================== */

function CustomizePanel({
  name,
  setName,

  bio,
  setBio,

  theme,
  setTheme,

  background,
  setBackground,

  windows,

  addWindow,
  updateWindow,
  deleteWindow,
  moveWindow,

  saveWorld,
  close,
  world,
  setWorld,
}: {
  name: string;

  setName: (
    value: string
  ) => void;

  bio: string;

  setBio: (
    value: string
  ) => void;

  theme: Theme;

  setTheme: (
    value: Theme
  ) => void;

  background: Background;

  setBackground: (
    value: Background
  ) => void;

  windows: WorldWindow[];

  addWindow: (
    type: WindowType
  ) => void;

  updateWindow: (
    id: number,
    key:
      | "title"
      | "content",
    value: string
  ) => void;

  deleteWindow: (
    id: number
  ) => void;

  moveWindow: (
    index: number,
    direction:
      | "up"
      | "down"
  ) => void;

  saveWorld: () => void;

  close: () => void;

  world: WorldData;

  setWorld: Dispatch<
    SetStateAction<WorldData>
  >;
}) {
  const albumCoverInputRef =
    useRef<HTMLInputElement>(null);
  const [coverBusy, setCoverBusy] =
    useState(false);
  const [coverError, setCoverError] =
    useState("");
  const [avatarDraft, setAvatarDraft] =
    useState<AvatarConfig>(() => ({
      ...world.profile.avatar,
    }));
  const [avatarCategory, setAvatarCategory] =
    useState<AvatarCategory>("hair");

  function saveAvatar() {
    setWorld((current) => ({
      ...current,
      profile: {
        ...current.profile,
        avatar: { ...avatarDraft },
      },
    }));
  }

  function updateProfile(
    key: "currently" | "status",
    value: string
  ) {
    setWorld((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [key]: value,
      },
    }));
  }

  function addTag() {
    if (world.profile.tags.length >= 6) {
      return;
    }

    setWorld((current) => ({
      ...current,
      profile: {
        ...current.profile,
        tags: [
          ...current.profile.tags,
          {
            id: Date.now(),
            icon: "♡",
            label: "new tag",
          },
        ],
      },
    }));
  }

  function updateTag(
    id: number,
    patch: Partial<ProfileTag>
  ) {
    setWorld((current) => ({
      ...current,
      profile: {
        ...current.profile,
        tags: current.profile.tags.map(
          (tag) =>
            tag.id === id
              ? { ...tag, ...patch }
              : tag
        ),
      },
    }));
  }

  function moveTag(
    index: number,
    direction: -1 | 1
  ) {
    const target = index + direction;

    if (
      target < 0 ||
      target >= world.profile.tags.length
    ) {
      return;
    }

    const tags = [...world.profile.tags];
    [tags[index], tags[target]] = [
      tags[target],
      tags[index],
    ];

    setWorld((current) => ({
      ...current,
      profile: {
        ...current.profile,
        tags,
      },
    }));
  }

  function deleteTag(id: number) {
    setWorld((current) => ({
      ...current,
      profile: {
        ...current.profile,
        tags: current.profile.tags.filter(
          (tag) => tag.id !== id
        ),
      },
    }));
  }

  function updateMusic(
    key: keyof MusicData,
    value: string
  ) {
    setWorld((current) => ({
      ...current,
      music: {
        ...current.music,
        [key]: value,
      },
    }));
  }

  async function chooseAlbumCover(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setCoverError(
        "Please choose an image file."
      );
      event.target.value = "";
      return;
    }

    setCoverBusy(true);
    setCoverError("");

    try {
      const compressed =
        await compressAlbumCover(file);
      updateMusic("cover", compressed);
    } catch {
      setCoverError(
        "That photo could not be prepared. Please try another one."
      );
    } finally {
      setCoverBusy(false);
      event.target.value = "";
    }
  }

  return (
    <div className="customizeArea">

      {/* PROFILE */}

      <div className="window">

        <WindowTitle
          title="customize_profile.exe"
          close={close}
        />

        <div className="windowContent editor">

          <label>
            World name

            <input
              value={name}
              maxLength={30}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
            />
          </label>

          <label>
            Bio

            <textarea
              value={bio}
              rows={3}
              maxLength={100}
              onChange={(e) =>
                setBio(
                  e.target.value
                )
              }
            />
          </label>

          <label>
            Current status

            <input
              value={world.profile.status}
              maxLength={24}
              placeholder="online"
              onChange={(event) =>
                updateProfile(
                  "status",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Currently

            <textarea
              value={world.profile.currently}
              rows={2}
              maxLength={80}
              placeholder="currently building Ki-ring World ♡"
              onChange={(event) =>
                updateProfile(
                  "currently",
                  event.target.value
                )
              }
            />
          </label>

        </div>
      </div>

      <div className="window avatarMakerWindow">
        <WindowTitle title="avatar_maker.exe" />

        <div className="windowContent avatarMaker">
          <div className="avatarMakerPreview">
            <AvatarStack avatar={avatarDraft} />
            <span>mix + match your pixel self ✦</span>
          </div>

          <div className="avatarCategoryTabs" role="tablist" aria-label="Avatar categories">
            {AVATAR_CATEGORIES.map((category) => (
              <button
                type="button"
                role="tab"
                aria-selected={avatarCategory === category}
                className={avatarCategory === category ? "selected" : ""}
                key={category}
                onClick={() => setAvatarCategory(category)}
              >
                {AVATAR_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          <div className="avatarChoices" role="tabpanel">
            {AVATAR_OPTIONS[avatarCategory].map((option) => {
              const preview = {
                ...avatarDraft,
                [avatarCategory]: option.id,
              };

              return (
                <button
                  type="button"
                  className={avatarDraft[avatarCategory] === option.id ? "selected" : ""}
                  aria-pressed={avatarDraft[avatarCategory] === option.id}
                  key={option.id}
                  onClick={() =>
                    setAvatarDraft((current) => ({
                      ...current,
                      [avatarCategory]: option.id,
                    }))
                  }
                >
                  <AvatarStack avatar={preview} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <button
            className="saveAvatarButton"
            type="button"
            data-sound="chime"
            onClick={saveAvatar}
          >
            Save Avatar ♡
          </button>
        </div>
      </div>

      {/* MY TAGS */}

      <div className="window">
        <WindowTitle title="my_tags.exe" />

        <div className="windowContent tagEditor">
          <p className="editorHint">
            Pick up to 6 tiny labels for your world.
          </p>

          {world.profile.tags.map(
            (tag, index) => (
              <div
                className="tagEditorRow"
                key={tag.id}
              >
                <select
                  aria-label={`Icon for ${tag.label}`}
                  value={tag.icon}
                  onChange={(event) =>
                    updateTag(tag.id, {
                      icon: event.target.value,
                    })
                  }
                >
                  {TAG_ICONS.map((icon) => (
                    <option
                      value={icon}
                      key={icon}
                    >
                      {icon}
                    </option>
                  ))}
                </select>

                <input
                  aria-label="Tag label"
                  value={tag.label}
                  maxLength={18}
                  onChange={(event) =>
                    updateTag(tag.id, {
                      label: event.target.value,
                    })
                  }
                />

                <button
                  type="button"
                  disabled={index === 0}
                  aria-label="Move tag up"
                  onClick={() =>
                    moveTag(index, -1)
                  }
                >
                  ↑
                </button>

                <button
                  type="button"
                  disabled={
                    index ===
                    world.profile.tags.length - 1
                  }
                  aria-label="Move tag down"
                  onClick={() =>
                    moveTag(index, 1)
                  }
                >
                  ↓
                </button>

                <button
                  type="button"
                  className="deleteButton"
                  aria-label="Delete tag"
                  onClick={() =>
                    deleteTag(tag.id)
                  }
                >
                  ×
                </button>
              </div>
            )
          )}

          <button
            className="addTagButton"
            type="button"
            disabled={
              world.profile.tags.length >= 6
            }
            onClick={addTag}
          >
            + Add tag ({world.profile.tags.length}/6)
          </button>
        </div>
      </div>

      {/* MUSIC */}

      <div className="window">
        <WindowTitle title="my_bgm.exe" />

        <div className="windowContent musicCustomizer">
          <div className="bgmEditorFields">
            <label>
              Song title
              <input
                value={world.music.title}
                maxLength={60}
                placeholder="favorite song"
                onChange={(event) =>
                  updateMusic(
                    "title",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Artist
              <input
                value={world.music.artist}
                maxLength={60}
                placeholder="favorite artist"
                onChange={(event) =>
                  updateMusic(
                    "artist",
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <div className="albumCoverField">
            <span className="albumCoverLabel">
              Album cover
            </span>

            <button
              className="albumCoverPicker"
              type="button"
              disabled={coverBusy}
              aria-label={
                world.music.cover ||
                world.music.albumArtworkUrl
                  ? "Change album cover photo"
                  : "Choose album cover photo"
              }
              onClick={() =>
                albumCoverInputRef.current?.click()
              }
            >
              {isImageSource(
                world.music.cover ||
                  world.music.albumArtworkUrl
              ) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    world.music.cover ||
                    world.music.albumArtworkUrl
                  }
                  alt="Selected album cover preview"
                />
              ) : (
                <div className="defaultCdCover">
                  <span className="defaultCdDisc">
                    <span />
                  </span>
                  <small>KI-RING BGM ✦</small>
                </div>
              )}

              {coverBusy && (
                <span className="coverBusy">
                  preparing photo...
                </span>
              )}
            </button>

            <input
              ref={albumCoverInputRef}
              className="albumCoverInput"
              type="file"
              accept="image/*"
              aria-label="Choose album cover image"
              onChange={chooseAlbumCover}
            />

            <div className="albumCoverActions">
              <button
                type="button"
                disabled={coverBusy}
                onClick={() =>
                  albumCoverInputRef.current?.click()
                }
              >
                {world.music.cover
                  ? "Change photo"
                  : world.music.albumArtworkUrl
                    ? "Customize photo"
                    : "Choose photo ♡"}
              </button>

              {(world.music.cover ||
                world.music.albumArtworkUrl) && (
                <button
                  type="button"
                  className="deleteButton"
                  disabled={coverBusy}
                  onClick={() => {
                    updateMusic("cover", "");
                    updateMusic(
                      "albumArtworkUrl",
                      ""
                    );
                    setCoverError("");
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            <span className="fieldHint">
              Choose a square image from your phone. It is resized and saved locally.
            </span>

            {coverError && (
              <span
                className="coverError"
                role="alert"
              >
                {coverError}
              </span>
            )}
          </div>

          <div className="bgmEditorFields">
            <label>
              Listen link (optional)
              <input
                type="url"
                inputMode="url"
                value={world.music.listenUrl}
                maxLength={1000}
                placeholder="Spotify, YouTube, Apple Music, or another link"
                onChange={(event) =>
                  updateMusic(
                    "listenUrl",
                    event.target.value
                  )
                }
              />
              <span className="fieldHint">
                This opens the original service in a new tab. Ki-ring World does not download or stream it.
              </span>
            </label>
          </div>

        </div>
      </div>

      {/* APPEARANCE */}

      <div className="window">

        <WindowTitle
          title="appearance.exe"
        />

        <div className="windowContent">

          <p className="editorHeading">
            theme
          </p>

          <div className="optionGrid">

            <OptionButton
              label="Pink"
              sound="chime"
              selected={
                theme === "pink"
              }
              onClick={() =>
                setTheme("pink")
              }
            />

            <OptionButton
              label="Win Blue"
              sound="chime"
              selected={
                theme === "blue"
              }
              onClick={() => {
                setTheme("blue");
                setBackground(
                  "cloud"
                );
              }}
            />

            <OptionButton
              label="Cyworld"
              sound="chime"
              selected={
                theme ===
                "cyworld"
              }
              onClick={() =>
                setTheme(
                  "cyworld"
                )
              }
            />

            <OptionButton
              label="Girly"
              sound="chime"
              selected={
                theme ===
                "girly"
              }
              onClick={() =>
                setTheme(
                  "girly"
                )
              }
            />

          </div>

          <p className="editorHeading">
            background
          </p>

          <div className="optionGrid">

            <OptionButton
              label="Dots"
              selected={
                background ===
                "dots"
              }
              onClick={() =>
                setBackground(
                  "dots"
                )
              }
            />

            <OptionButton
              label="Gingham"
              selected={
                background ===
                "gingham"
              }
              onClick={() =>
                setBackground(
                  "gingham"
                )
              }
            />

            <OptionButton
              label="Stars"
              selected={
                background ===
                "stars"
              }
              onClick={() =>
                setBackground(
                  "stars"
                )
              }
            />

            <OptionButton
              label="Cloud"
              selected={
                background ===
                "cloud"
              }
              onClick={() =>
                setBackground(
                  "cloud"
                )
              }
            />

          </div>

        </div>
      </div>

      {/* ADD WINDOW */}

      <div className="window">

        <WindowTitle
          title="add_window.exe"
        />

        <div className="windowContent">

          <div className="addWindowGrid">

            <button
              type="button"
              onClick={() =>
                addWindow("text")
              }
            >
              + Text
            </button>

            <button
              type="button"
              onClick={() =>
                addWindow("likes")
              }
            >
              + Likes
            </button>

            <button
              type="button"
              onClick={() =>
                addWindow("note")
              }
            >
              + Note
            </button>

          </div>
        </div>
      </div>

      {/* WINDOW EDITORS */}

      {windows.map(
        (item, index) => (
          <div
            className="window"
            key={item.id}
          >

            <WindowTitle
              title={`window_${
                index + 1
              }.exe`}
            />

            <div className="windowContent editor">

              <label>
                Window title

                <input
                  value={
                    item.title
                  }
                  onChange={(e) =>
                    updateWindow(
                      item.id,
                      "title",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Content

                <textarea
                  rows={4}
                  value={
                    item.content
                  }
                  onChange={(e) =>
                    updateWindow(
                      item.id,
                      "content",
                      e.target.value
                    )
                  }
                />
              </label>

              <div className="windowControls">

                <button
                  type="button"
                  disabled={
                    index === 0
                  }
                  onClick={() =>
                    moveWindow(
                      index,
                      "up"
                    )
                  }
                >
                  ↑
                </button>

                <button
                  type="button"
                  disabled={
                    index ===
                    windows.length -
                      1
                  }
                  onClick={() =>
                    moveWindow(
                      index,
                      "down"
                    )
                  }
                >
                  ↓
                </button>

                <button
                  type="button"
                  className="deleteButton"
                  onClick={() =>
                    deleteWindow(
                      item.id
                    )
                  }
                >
                  Delete
                </button>

              </div>

            </div>
          </div>
        )
      )}

      <button
        type="button"
        className="saveWorldButton"
        data-sound="chime"
        onClick={saveWorld}
      >
        Save My World ♡
      </button>

    </div>
  );
}

/* ===================================
   CONTENT WINDOW
=================================== */

function WorldWindowView({
  window,
}: {
  window: WorldWindow;
}) {
  return (
    <div className="window">

      <WindowTitle
        title={window.title}
      />

      {window.type ===
      "music" ? (
        <div className="windowContent music">

          <div className="album">
            💿
          </div>

          <div className="musicInfo">

            <p className="songTitle">
              {window.content}
            </p>

            <div className="musicButtons">
              <span className="legacyMusicLabel">
                ♫ saved music note
              </span>

            </div>

            <div className="progress">
              <div />
            </div>

          </div>
        </div>
      ) : window.type ===
        "likes" ? (
        <div className="windowContent likesWindow">

          {window.content
            .split("\n")
            .filter(Boolean)
            .map(
              (
                item,
                index
              ) => (
                <span
                  key={index}
                >
                  ♡ {item}
                </span>
              )
            )}

        </div>
      ) : (
        <div className="windowContent textWindow">

          {window.content
            .split("\n")
            .map(
              (
                line,
                index
              ) => (
                <p
                  key={index}
                >
                  {line}
                </p>
              )
            )}

        </div>
      )}

    </div>
  );
}

/* ===================================
   PINK Y2K DECOR
=================================== */

function PinkDesktopDecor() {
  return (
    <div
      className="pinkDecor"
      aria-hidden="true"
    >
      <span className="pinkSticker pinkStickerStar">
        ★
      </span>

      <span className="pinkSticker pinkStickerHeart">
        ♥
      </span>

      <span className="pinkSticker pinkStickerButterfly">
        🦋
      </span>

      <span className="pinkSticker pinkStickerSparkle">
        ✦
      </span>

      <span className="pinkBubble pinkBubbleOne" />
      <span className="pinkBubble pinkBubbleTwo" />
      <span className="pinkBubble pinkBubbleThree" />
    </div>
  );
}

/* ===================================
   WINDOWS 95/98 DECOR
=================================== */

function XpDesktopDecor() {
  return (
    <div
      className="xpDecor"
      aria-hidden="true"
    >

      {/* ICONS */}

      <div className="xpIcons">

        <div className="xpIcon">
          <div className="xpIconImage">
            🖥️
          </div>

          <span>
            My Computer
          </span>
        </div>

        <div className="xpIcon">
          <div className="xpIconImage">
            📁
          </div>

          <span>
            My Photos
          </span>
        </div>

        <div className="xpIcon">
          <div className="xpIconImage">
            🗑️
          </div>

          <span>
            Recycle Bin
          </span>
        </div>

      </div>

      {/* PAINT */}

      <div className="classicWindow paintWindow">

        <ClassicTitle
          title="untitled - Paint"
        />

        <div className="classicMenu">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Image</span>
          <span>Help</span>
        </div>

        <div className="paintBody">

          <div className="paintTools">

            {Array.from({
              length: 12,
            }).map((_, index) => (
              <div
                className="paintTool"
                key={index}
              />
            ))}

          </div>

          <div className="paintCanvas" />

        </div>

        <div className="paintPalette">

          {[
            "#000000",
            "#7f7f7f",
            "#800000",
            "#008000",
            "#008080",
            "#000080",
            "#800080",
            "#808000",
            "#ffffff",
            "#c0c0c0",
            "#ff0000",
            "#ffff00",
            "#00ff00",
            "#00ffff",
            "#0000ff",
            "#ff00ff",
            "#ff87bd",
            "#ffb264",
          ].map(
            (color, index) => (
              <span
                key={index}
                style={{
                  backgroundColor:
                    color,
                }}
              />
            )
          )}

        </div>

      </div>

      {/* MESSAGE WINDOW */}

      <div className="classicWindow messageWindow">

        <ClassicTitle
          title="message"
        />

        <div className="messageContent">
          <div className="messageWhiteArea">
            welcome to my world ♡
          </div>

          <div className="classicActions">

            <button
              type="button"
              tabIndex={-1}
            >
              OK
            </button>

            <button
              type="button"
              tabIndex={-1}
            >
              Cancel
            </button>

          </div>
        </div>

      </div>

      {/* LOADING */}

      <div className="classicWindow loadingWindow">

        <ClassicTitle
          title="Loading..."
        />

        <div className="loadingContent">

          <p>
            Loading...
          </p>

          <div className="classicProgress">
            <div />
          </div>

          <div className="classicActions">

            <button
              type="button"
              tabIndex={-1}
              disabled
            >
              Done
            </button>

            <button
              type="button"
              tabIndex={-1}
            >
              Cancel
            </button>

          </div>

        </div>
      </div>

    </div>
  );
}

function ClassicTitle({
  title,
}: {
  title: string;
}) {
  return (
    <div className="classicTitle">

      <strong>
        {title}
      </strong>

      <div className="classicTitleButtons">
        <span>_</span>
        <span>□</span>
        <span>×</span>
      </div>

    </div>
  );
}

/* ===================================
   GENERIC COMPONENTS
=================================== */

function WindowTitle({
  title,
  close,
}: {
  title: string;
  close?: () => void;
}) {
  return (
    <div className="titleBar">

      <span>
        <KitschLetters
          text={title}
        />
      </span>

      <div className="windowButtons">

        <span>_</span>

        <span>□</span>

        {close ? (
          <button
            type="button"
            aria-label="Close"
            onClick={close}
          >
            ×
          </button>
        ) : (
          <span>×</span>
        )}

      </div>

    </div>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
  sound,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  sound?: "chime";
}) {
  return (
    <button
      type="button"
      className={`
        optionButton
        ${
          selected
            ? "selected"
            : ""
        }
      `}
      data-sound={sound}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

let uiAudioContext:
  AudioContext | null = null;

function playUiSound(
  type: "click" | "chime"
) {
  uiAudioContext ??=
    new AudioContext();

  const context =
    uiAudioContext;

  if (context.state === "suspended") {
    void context.resume();
  }

  const now = context.currentTime;
  const master =
    context.createGain();

  master.gain.setValueAtTime(
    0.0001,
    now
  );
  master.gain.exponentialRampToValueAtTime(
    type === "chime"
      ? 0.09
      : 0.018,
    now +
      (type === "chime"
        ? 0.006
        : 0.012)
  );
  master.gain.exponentialRampToValueAtTime(
    0.0001,
    now +
      (type === "chime"
        ? 0.48
        : 0.11)
  );
  master.connect(
    context.destination
  );

  if (type === "click") {
    const oscillator =
      context.createOscillator();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      560,
      now
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      390,
      now + 0.09
    );
    oscillator.connect(master);
    oscillator.start(now);
    oscillator.stop(now + 0.11);
    return;
  }

  [659.25, 830.61, 987.77].forEach(
    (frequency, index) => {
      const oscillator =
        context.createOscillator();

      const noteStart =
        now + index * 0.075;

      oscillator.type =
        index === 2
          ? "sine"
          : "triangle";
      oscillator.frequency.setValueAtTime(
        frequency,
        noteStart
      );
      oscillator.connect(master);
      oscillator.start(noteStart);
      oscillator.stop(
        noteStart + 0.3
      );
    }
  );
}

function Photo({
  image,
}: {
  image: string;
}) {
  const isImage =
    image.startsWith("data:") ||
    image.startsWith("http://") ||
    image.startsWith("https://");

  return (
    <div className="photo">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt="Memory"
        />
      ) : (
        image
      )}
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`
        navButton
        ${
          active
            ? "active"
            : ""
        }
      `}
      onClick={onClick}
    >

      <span className="navIcon">
        {icon}
      </span>

      <span>
        <KitschLetters
          text={label}
        />
      </span>

    </button>
  );
}

function KitschLetters({
  text,
}: {
  text: string;
}) {
  return (
    <span
      className="kitschLetters"
      aria-label={text}
    >
      {Array.from(text).map(
        (letter, index) => (
          <span
            className="kitschLetter"
            aria-hidden="true"
            key={`${letter}-${index}`}
          >
            {letter === " "
              ? "\u00a0"
              : letter}
          </span>
        )
      )}
    </span>
  );
}
