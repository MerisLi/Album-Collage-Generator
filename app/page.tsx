"use client";

import { useEffect, useState } from "react";

type Album = {
id: number;
releaseId: string;
title: string;
artist: string;
cover: string;
};

type Release = {
id: string;
title: string;
artist: string;
date: string | null;
country: string | null;
status: string | null;
disambiguation: string | null;
cover: string | null;
added?: boolean;
};

const translations = {
en: {
// Header
addAlbum: "+ Add Album",


// Welcome
welcomeTitle: "Welcome to Album Wall",
welcome: "Welcome!",
step1: "Search for an album or artist.",
step2: "Add albums to your library.",
step3: "Select albums and create a collage.",
step4: "Shuffle to generate a random collage🪄.",
localStorageInfo:
  "Your album library is stored locally in your browser.",
artworkCopyrightTitle: "Artwork & Copyright",
artworkCopyright:
  "Album artwork belongs to its respective copyright holders. Album Wall does not claim ownership of third-party artwork. Please do not use generated wallpapers for commercial purposes unless you have the necessary rights or permissions.",

// Search
addAnAlbum: "Add an Album",
artist: "Artist",
releaseYear: "Release year",
albumName: "Album name",
search: "Search",
searching: "Searching...",
searchingMusicBrainz:
  "Searching MusicBrainz...",
artistYearExplanation:
  "Artist + year: browse releases from that year, including albums, EPs, and singles.",
artistAlbumExplanation:
  "Artist + album: search for a specific release with album artwork.",
searchTip:
  "Tip: If you can't find a release, try the artist's original or English name.",

// Search results
availableReleases: "Available releases",
searchResults: "Search results",
add: "Add",
adding: "Adding...",
added: "✓ Added",

// Errors
enterArtist:
  "Please enter an artist name.",
enterAlbumOrYear:
  "Please enter either an album name or a release year.",
noReleasesForYear:
  "No releases found for this artist and year.",
noMatchingReleases:
  "No matching releases found.",
searchFailed:
  "MusicBrainz search failed.",
unableToConnect:
  "Unable to connect to MusicBrainz.",
unableToGetCover:
  "Unable to get album cover.",
unableToAdd:
  "Unable to add album.",
coverNotFound:
  "Cover not found.",

// Library
cancel: "Cancel",
albumLibrary: "Album Library",
empty: "Empty",
delete: "Delete",

// Collage
createCollage: "Create your collage",
albumsSelected: "albums selected",
albumSelected: "album selected",
extraAlbum:
  "extra album. Only",
extraAlbums:
  "extra albums. Only",
willBeUsed: "will be used.",
generate: "Generate",
generating: "Generating...",
shuffle: "🎲 Shuffle",
download: "Download",
swapHint:
  "Double-click one cover, then another to swap their positions.",


},

zh: {
// Header
addAlbum: "+ 添加专辑",


// Welcome
welcomeTitle: "欢迎使用 Album Wall",
welcome: "欢迎！",
step1: "搜索专辑或艺人。",
step2: "将专辑添加到你的收藏库。",
step3: "选择专辑并创建专辑拼图。",
step4: "点击随机按钮生成随机拼贴🪄。",
localStorageInfo:
  "已添加到收藏库的专辑会保存在浏览器本地。",
artworkCopyrightTitle: "图片与版权",
artworkCopyright:
  "专辑封面图片版权归其相应的版权所有者所有。本网站不拥有第三方图片的版权。除非您获取了必要的授权，否则请勿将生成的壁纸用于商业用途。",

// Search
addAnAlbum: "添加专辑",
artist: "艺人",
releaseYear: "发行年份",
albumName: "专辑名称",
search: "搜索",
searching: "搜索中...",
searchingMusicBrainz:
  "正在搜索 MusicBrainz...",
artistYearExplanation:
  "艺人 + 年份：浏览该艺人在这一年的发行记录，包括专辑、EP 和单曲。",
artistAlbumExplanation:
  "艺人 + 专辑：搜索特定发行，并优先获取专辑封面。",
searchTip:
  "提示：如果搜不到发行记录，可以试试艺人的原名或英文名。",

// Search results
availableReleases: "可用发行记录",
searchResults: "搜索结果",
add: "添加",
adding: "添加中...",
added: "✓ 已添加",

// Errors
enterArtist:
  "请输入艺人名称。",
enterAlbumOrYear:
  "请输入专辑名称或发行年份。",
noReleasesForYear:
  "没有找到该艺人在这一年的发行记录。",
noMatchingReleases:
  "没有找到匹配的发行记录。",
searchFailed:
  "MusicBrainz 搜索失败。",
unableToConnect:
  "无法连接到 MusicBrainz。",
unableToGetCover:
  "无法获取专辑封面。",
unableToAdd:
  "无法添加该专辑。",
coverNotFound:
  "找不到该专辑封面。",

// Library
cancel: "取消",
albumLibrary: "专辑收藏库",
empty: "空空如也",
delete: "删除",

// Collage
createCollage: "创建你的专辑拼图",
albumsSelected: "张专辑已选择",
albumSelected: "张专辑已选择",
extraAlbum:
  "张多余的专辑。只会使用",
extraAlbums:
  "张多余的专辑。只会使用",
willBeUsed: "张专辑。",
generate: "生成",
generating: "生成中...",
shuffle: "🎲 随机生成",
download: "下载",
swapHint:
  "双击一张封面，再点击想要更换位置的封面来交换它们的位置",


},
};

export default function Home() {
const [albums, setAlbums] =
useState<Album[]>([]);

const [selectedAlbums, setSelectedAlbums] =
useState<number[]>([]);

const [wallpaperUrl, setWallpaperUrl] =
useState<string | null>(null);

const [wallpaperOrder, setWallpaperOrder] =
useState<number[]>([]);

const [swapMode, setSwapMode] =
useState(false);

const [swapSource, setSwapSource] =
useState<number | null>(null);

const [gridSize, setGridSize] =
useState<2 | 3 | 4>(2);

const [loaded, setLoaded] =
useState(false);

const [language, setLanguage] =
useState<"en" | "zh">("en");

const t = translations[language];

const [showWelcome, setShowWelcome] =
useState(true);

const [showForm, setShowForm] =
useState(false);

// --------------------------------
// Search states
// --------------------------------

const [title, setTitle] =
useState("");

const [artist, setArtist] =
useState("");

const [year, setYear] =
useState("");

const [releases, setReleases] =
useState<Release[]>([]);

const [artistOnlySearch, setArtistOnlySearch] =
useState(false);

const [searching, setSearching] =
useState(false);

const [generating, setGenerating] =
useState(false);

const [addingId, setAddingId] =
useState<string | null>(null);

const [error, setError] =
useState("");

// -----------------------------
// Load albums from localStorage
// -----------------------------

useEffect(() => {
const savedAlbums =
localStorage.getItem(
"album-wall"
);


if (savedAlbums) {
  try {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlbums(
      JSON.parse(savedAlbums)
    );
  } catch {
    localStorage.removeItem(
      "album-wall"
    );
  }
}

setLoaded(true);


}, []);

// -----------------------------
// Save albums to localStorage
// -----------------------------

useEffect(() => {
if (!loaded) return;


localStorage.setItem(
  "album-wall",
  JSON.stringify(albums)
);


}, [albums, loaded]);

// -----------------------------
// Search MusicBrainz
// -----------------------------

async function searchAlbums() {
const cleanArtist =
artist.trim();


const cleanTitle =
  title.trim();

const cleanYear =
  year.trim();

const artistYearSearch =
  Boolean(
    cleanArtist &&
    cleanYear &&
    !cleanTitle
  );

if (!cleanArtist) {
  setError(t.enterArtist);
  return;
}

if (
  !cleanYear &&
  !cleanTitle
) {
  setError(t.enterAlbumOrYear);
  return;
}

setSearching(true);
setError("");
setReleases([]);
setArtistOnlySearch(false);

try {
  const params =
    new URLSearchParams();

  params.set(
    "artist",
    cleanArtist
  );

  if (cleanYear) {
    params.set(
      "year",
      cleanYear
    );
  }

  if (cleanTitle) {
    params.set(
      "title",
      cleanTitle
    );
  }

  const response =
    await fetch(
      `/api/search-album?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error === "coverNotFound"
        ? t.coverNotFound
        : data.error || t.searchFailed
    );
  }

  const resultReleases =
    data.releases ?? [];

  setReleases(
    resultReleases
  );

  setArtistOnlySearch(
    data.searchMode ===
      "artist-year"
  );

  if (!resultReleases.length) {
    setError(
      artistYearSearch
        ? t.noReleasesForYear
        : t.noMatchingReleases
    );
  }

} catch (error) {
  console.error(
    "Album search failed:",
    error
  );

  setError(
    error instanceof Error
      ? error.message
      : t.unableToConnect
  );

} finally {
  setSearching(false);
}


}


// -----------------------------
// Add selected release
// -----------------------------

async function addAlbum(
  release: Release
) {
  console.log("Adding release:", release);

  setAddingId(
    release.id
  );

  setError("");

  try {
    let cover = release.cover;
    if (!cover) {
  const response =
    await fetch(
      `/api/album-cover?id=${encodeURIComponent(
        release.id
      )}`
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error === "coverNotFound"
        ? t.coverNotFound
        : data.error || t.searchFailed
    );
  }

  cover = data.image;
}

if (!cover) {
  throw new Error(t.coverNotFound);
}

const newAlbum: Album = {
      id:
        Math.max(
          0,
          ...albums.map(
            (album) => album.id
          )
        ) + 1,

      releaseId:
        release.id,

      title:
        release.title,

      artist:
        release.artist,

      cover:
        cover,
    };

    setAlbums(
      (currentAlbums) => [
        ...currentAlbums,
        newAlbum,
      ]
    );

    setReleases(
      (currentReleases) =>
        currentReleases.map(
          (item) =>
            item.id ===
            release.id
              ? {
                  ...item,
                  added: true,
                }
              : item
        )
    );

  } catch (error) {
    console.error(error);

    setError(
      error instanceof Error
        ? error.message
        : t.unableToAdd
    );

  } finally {
    setAddingId(null);
  }
}

// -----------------------------
// Delete album
// -----------------------------

function deleteAlbum(id: number) {
  setAlbums((currentAlbums) =>
    currentAlbums.filter(
      (album) => album.id !== id
    )
  );

  // Remove the deleted album from selection
  setSelectedAlbums((currentSelected) =>
    currentSelected.filter(
      (albumId) => albumId !== id
    )
  );

  // Remove the deleted album from the current wallpaper order
  setWallpaperOrder((currentOrder) =>
    currentOrder.filter(
      (albumId) => albumId !== id
    )
  );

  // Reset the generated collage because it may contain the deleted album
  setWallpaperUrl(null);

  // Cancel swap mode if the deleted album was involved
  if (swapSource === id) {
    setSwapSource(null);
    setSwapMode(false);
  }
}

// -----------------------------
// Open form
// -----------------------------

function openForm() {
setShowForm(true);
setError("");
setReleases([]);
setArtistOnlySearch(false);
}

// -----------------------------
// Select albums for wallpaper
// -----------------------------

function toggleAlbum(
id: number
) {
setSelectedAlbums(
(current) =>
current.includes(id)
? current.filter(
(albumId) =>
albumId !== id
)
: [
...current,
id,
]
);


setWallpaperUrl(null);


}

// -----------------------------
// Swap albums
// -----------------------------

function handleSwapClick(id: number) {
  if (swapSource === null) {
    return;
  }

  if (swapSource === id) {
    setSwapSource(null);
    setSwapMode(false);
    return;
  }

  const currentOrder = [...wallpaperOrder];

  const firstIndex =
    currentOrder.indexOf(swapSource);

  const secondIndex =
    currentOrder.indexOf(id);

  if (
    firstIndex === -1 ||
    secondIndex === -1
  ) {
    return;
  }

  const newOrder =
    [...currentOrder];

  [
    newOrder[firstIndex],
    newOrder[secondIndex],
  ] = [
    newOrder[secondIndex],
    newOrder[firstIndex],
  ];

  setWallpaperOrder(
    newOrder
  );

  setSwapSource(null);
  setSwapMode(false);

  void generateWallpaper(
    newOrder
  );
}



// -----------------------------
// Generate wallpaper
// -----------------------------

async function generateWallpaper(
customOrder?: number[]
) {
setGenerating(true);


try {
  const requiredAlbums =
    gridSize * gridSize;

  if (
    !customOrder &&
    selectedAlbums.length <
      requiredAlbums
  ) {
    return;
  }

  const order =
    customOrder ??
    selectedAlbums;

  setWallpaperOrder(
    order
  );

  const selected =
    order
      .map((id) =>
        albums.find(
          (album) =>
            album.id === id
        )
      )
      .filter(
        (
          album
        ): album is Album =>
          album !== undefined
      );

  const canvas =
    document.createElement(
      "canvas"
    );

  const size = 1200;

  const cellSize =
    size / gridSize;

  canvas.width =
    size;

  canvas.height =
    size;

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    return;
  }

  ctx.fillStyle =
    "#f5f3ef";

  ctx.fillRect(
    0,
    0,
    size,
    size
  );

  const images =
    await Promise.all(
      selected
        .slice(
          0,
          gridSize *
            gridSize
        )
        .map(
          (album) =>
            new Promise<HTMLImageElement>(
              (
                resolve,
                reject
              ) => {
                const image =
                  new Image();

                image.crossOrigin =
                  "anonymous";

                image.onload =
                  () =>
                    resolve(
                      image
                    );

              
                image.onerror = () => {
                  console.error(
                    "Failed to load album cover:",
                    album.title,
                    album.artist,
                    album.cover
                  );

                  reject(
                    new Error(
                      `Failed to load image: ${album.cover}`
                    )
                  );
                };



                image.src =
                  album.cover;
              }
            )
        )
    );

  images.forEach(
    (
      image,
      index
    ) => {
      const x =
        (index %
          gridSize) *
        cellSize;

      const y =
        Math.floor(
          index /
            gridSize
        ) *
        cellSize;

      ctx.drawImage(
        image,
        x,
        y,
        cellSize,
        cellSize
      );
    }
  );

  const url =
    canvas.toDataURL(
      "image/png"
    );

  setWallpaperUrl(
    url
  );

} catch (error) {
  console.error(
    "Wallpaper generation failed:",
    error
  );

} finally {
  setGenerating(false);
}


}

// -----------------------------
// Shuffle wallpaper
// -----------------------------

async function shuffleWallpaper() {
const requiredAlbums =
gridSize * gridSize;


if (
  albums.length <
  requiredAlbums
) {
  return;
}

const shuffled =
  [...albums];

for (
  let i =
    shuffled.length - 1;
  i > 0;
  i--
) {
  const j =
    Math.floor(
    // eslint-disable-next-line react-hooks/purity
    Math.random() *
      (i + 1)
  );

  [
    shuffled[i],
    shuffled[j],
  ] = [
    shuffled[j],
    shuffled[i],
  ];
}

const randomAlbums =
  shuffled
    .slice(
      0,
      requiredAlbums
    )
    .map(
      (album) =>
        album.id
    );

setWallpaperOrder(
  randomAlbums
);

await generateWallpaper(
  randomAlbums
);


}

// -----------------------------
// Download Wallpaper
// -----------------------------

async function downloadWallpaper() {
  if (!wallpaperUrl) {
    return;
  }

  try {
    const response = await fetch(wallpaperUrl);
    const blob = await response.blob();

    const file = new File(
      [blob],
      "album-wall.png",
      { type: "image/png" }
    );

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );

    // Use the mobile share sheet on phones/tablets
    if (
      isMobile &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: "Album Wall",
      });

      return;
    }

    // Normal download for desktop
    const link =
      document.createElement("a");

    const url =
      URL.createObjectURL(blob);

    link.href = url;
    link.download = "album-wall.png";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      return;
    }

    console.error(
      "Wallpaper download failed:",
      error
    );
  }
}

// -----------------------------
// Render
// -----------------------------

return (
  <>
{showWelcome && ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-3"> <div className="w-full max-w-[420px] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] shadow-[4px_4px_0_#000]">


        <div className="flex items-center justify-between bg-[#000080] px-2 py-1 text-white">
          <span className="min-w-0 truncate font-[family-name:var(--font-pixelify)] text-sm">
            {t.welcomeTitle}
          </span>

          <button
            onClick={() =>
              setShowWelcome(
                false
              )
            }
            className="ml-2 flex h-4 w-4 shrink-0 items-center justify-center border border-white border-b-black border-r-black bg-[#c0c0c0] text-xs font-bold leading-none text-black"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-5">

          <h2 className="font-[family-name:var(--font-pixelify)] text-lg">
            {t.welcome}
          </h2>

          <div className="mt-4 space-y-2 text-sm">

            <p>
              <span className="font-bold">
                1.
              </span>{" "}
              {t.step1}
            </p>

            <p>
              <span className="font-bold">
                2.
              </span>{" "}
              {t.step2}
            </p>

            <p>
              <span className="font-bold">
                3.
              </span>{" "}
              {t.step3}
            </p>

            <p>
              <span className="font-bold">
                4.
              </span>{" "}
              {t.step4}
            </p>

          </div>

          <div className="mt-5 border-2 border-[#808080] border-b-white border-r-white bg-[#e0e0e0] p-3 text-xs">
            {t.localStorageInfo}
          </div>

          <div className="mt-4 text-xs leading-relaxed text-neutral-600">
          <p className="font-bold">
            {t.artworkCopyrightTitle}
          </p>

          <p className="mt-1">
            {t.artworkCopyright}
          </p>
        </div>

          <div className="mt-5 flex justify-end">

            <button
              onClick={() =>
                setShowWelcome(
                  false
                )
              }
              className="w-full border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-6 py-1 text-sm font-medium active:border-b-white active:border-r-white sm:w-auto"
            >
              OK
            </button>

          </div>

        </div>
      </div>
    </div>
  )}

  <main
    className={`min-h-screen overflow-x-hidden bg-[#3a6ea5] p-2 text-black sm:p-4 md:p-6 ${
      language === "zh"
        ? "font-[var(--font-zpix)]"
        : "font-sans"
    }`}
  >

    <div className="mx-auto max-w-7xl border-2 border-white bg-[#c0c0c0] shadow-[4px_4px_0_#000]">

      {/* Header */}

      <header>

        {/* Title Bar */}

        <div className="flex min-h-8 items-center justify-between bg-[#000080] px-2 py-1 font-[family-name:var(--font-pixelify)] text-white">

          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-sm">
              🎵
            </span>

            <span className="truncate text-sm font-medium">
              Album Wall
            </span>
          </div>

          <div className="ml-2 flex shrink-0 gap-1 text-black">

            <button className="flex h-5 w-5 items-center justify-center border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-xs">
              _
            </button>

            <button className="flex h-5 w-5 items-center justify-center border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-xs">
              □
            </button>

            <button className="flex h-5 w-5 items-center justify-center border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-xs">
              ×
            </button>

          </div>

        </div>

        {/* Menu Bar */}

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#808080] bg-[#c0c0c0] px-2 py-1 font-[family-name:var(--font-pixelify)] text-sm text-black sm:px-3">

          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 sm:gap-x-5">
            <span>File</span>
            <span>Edit</span>
            <span>View</span>
            <span>Library</span>
            <span>Wallpaper</span>
            <span>Help</span>
          </div>

          <button
            onClick={() => {
              setLanguage(
                language === "en"
                  ? "zh"
                  : "en"
              );

              setShowWelcome(true);
              setShowForm(false);
            }}
            className="shrink-0 border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-2 py-0.5 text-xs"
          >
            {language === "en"
              ? "中文"
              : "English"}
          </button>

        </div>

        {/* Add Album */}

        <div className="flex justify-stretch bg-[#c0c0c0] p-2 sm:justify-end sm:p-3">

          <button
            onClick={
              openForm
            }
            className="w-full font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-4 py-2 text-sm text-black active:border-b-white active:border-r-white sm:w-auto sm:py-1"
          >
            {t.addAlbum}
          </button>

        </div>

      </header>

      {/* Add Album Form */}

      {showForm && (
        <div className="mb-6 border-2 border-white bg-[#c0c0c0] p-3 shadow-[2px_2px_0_#808080] sm:mb-10 sm:p-6">

          <h2 className="mb-4 text-sm font-bold">
            {t.addAnAlbum}
          </h2>

          {/* Search Inputs */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">

            {/* Artist */}

            <input
              type="text"
              placeholder={t.artist}
              value={
                artist
              }
              onChange={(
                e
              ) =>
                setArtist(
                  e.target
                    .value
                )
              }
              className="min-w-0 w-full border-2 border-[#808080] border-r-white border-b-white bg-white px-3 py-3 outline-none focus:border-black sm:px-4"
            />

            {/* Year */}

            <input
              type="text"
              inputMode="numeric"
              placeholder={t.releaseYear}
              value={
                year
              }
              onChange={(
                e
              ) =>
                setYear(
                  e.target.value
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(
                      0,
                      4
                    )
                )
              }
              className="min-w-0 w-full border-2 border-[#808080] border-r-white border-b-white bg-white px-3 py-3 outline-none focus:border-black sm:px-4"
            />

            {/* Album */}

            <input
              type="text"
              placeholder={t.albumName}
              value={
                title
              }
              onChange={(
                e
              ) =>
                setTitle(
                  e.target
                    .value
                )
              }
              className="min-w-0 w-full border-2 border-[#808080] border-r-white border-b-white bg-white px-3 py-3 outline-none focus:border-black sm:px-4"
            />

            {/* Search */}

            <button
              onClick={
                searchAlbums
              }
              disabled={
                searching
              }
              className="w-full font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-5 py-3 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
            >
              {searching
                ? t.searching
                : t.search}
            </button>

          </div>

          {/* Search explanation */}

          <div className="mt-3 text-xs text-neutral-600">

            <p>
              {t.artistYearExplanation}
            </p>

            <p>
              {t.artistAlbumExplanation}
            </p>

            <p>
              {t.searchTip}
            </p>

          </div>

          {/* Error */}

          {error && (
            <p className="mt-4 break-words text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Loading */}

          {searching && (
            <div className="mt-4">

              <div className="h-2 w-full overflow-hidden border border-[#808080] bg-white">

                <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] bg-[#000080]" />

              </div>

              <p className="mt-2 text-xs text-black">
                {t.searchingMusicBrainz}
              </p>

            </div>
          )}

          {/* Search Results */}

          {releases.length > 0 && (
            <div className="mt-6">
          

              {/* Results header */}

              <div className="mb-4">
                <h3 className="text-sm font-medium text-neutral-500">
                  {artistOnlySearch
                    ? t.availableReleases
                    : t.searchResults}
                </h3>
              </div>

              {/* Release list */}

              <div className="space-y-2">

                {releases.map(
                  (
                    release
                  ) => (

                    <div
                      key={
                        release.id
                      }
                      className="flex flex-col gap-3 border border-[#808080] bg-[#d8e2ee] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-2"
                    >

                      {/* Album information */}

                      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">

                        {/* Cover */}

                        {release.cover && (
                          <img
                            src={
                              release.cover
                            }
                            alt={
                              release.title
                            }
                            className="h-16 w-16 shrink-0 object-cover sm:h-20 sm:w-20"
                          />
                        )}

                        {/* Text */}

                        <div className="min-w-0 flex-1">

                          <p className="break-words font-medium">
                            {
                              release.title
                            }
                          </p>

                          <p className="mt-1 break-words text-sm text-neutral-500">
                            {
                              release.artist
                            }

                            {release.date &&
                              ` · ${release.date}`}

                            {release.country &&
                              ` · ${release.country}`}
                          </p>

                          {release.disambiguation && (
                            <p className="mt-1 break-words text-xs text-neutral-400">
                              {
                                release.disambiguation
                              }
                            </p>
                          )}

                        </div>

                      </div>

                      {/* Add button */}

                      {albums.some(
                        (
                          album
                        ) =>
                          album.releaseId ===
                          release.id
                      ) ||
                      release.added ? (

                        <button
                          disabled
                          className="w-full shrink-0 font-[family-name:var(--font-pixelify)] border-2 border-[#808080] bg-[#d4d0c8] px-4 py-2 text-sm text-[#404040] sm:ml-4 sm:w-auto sm:py-1.5"
                        >
                          {t.added}
                        </button>

                      ) : (

                        <button
                          onClick={() =>
                            addAlbum(
                              release
                            )
                          }
                          disabled={
                            addingId !==
                            null
                          }
                          className="w-full shrink-0 font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-4 py-2 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50 sm:ml-4 sm:w-auto sm:py-1.5"
                        >
                          {addingId === release.id
                            ? t.adding
                            : t.add}
                        </button>

                      )}

                    </div>

                  )
                )}

              </div>

            </div>
          )}

          {/* Cancel */}

          <div className="mt-5">

            <button
              onClick={() => {
                setShowForm(
                  false
                );

                setReleases(
                  []
                );

                setError(
                  ""
                );

                setArtistOnlySearch(
                  false
                );
              }}
              className="w-full font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-5 py-2 text-sm text-black active:border-b-white active:border-r-white sm:w-auto sm:py-1.5"
            >
              {t.cancel}
            </button>

          </div>

        </div>
      )}

      {/* Album Library */}

      <div className="mb-4 border-b border-[#808080] bg-[#c0c0c0] px-3 py-2 font-[family-name:var(--font-pixelify)] text-sm">
        {t.albumLibrary}
      </div>

      {/* Album Grid */}

      {albums.length === 0 ? (

        <div className="py-16 text-center sm:py-20">
          <p className="text-lg text-neutral-400">
            {t.empty}
          </p>
        </div>

      ) : (

        <section className="grid grid-cols-2 gap-1 border-2 border-[#808080] bg-[#808080] p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">

          {albums.map(
            (
              album
            ) => (

              <article
                key={
                  album.id
                }
                onClick={() =>
                  toggleAlbum(
                    album.id
                  )
                }
                className={`group relative aspect-square cursor-pointer overflow-hidden bg-neutral-200 ${
                  selectedAlbums.includes(
                    album.id
                  )
                    ? "ring-4 ring-[#000080] ring-inset"
                    : ""
                }`}
              >

                <img
                  src={
                    album.cover
                  }
                  alt={`${album.title} by ${album.artist}`}
                  className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                />

                {selectedAlbums.includes(
                  album.id
                ) && (
                  <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-sm font-bold text-black sm:left-3 sm:top-3 sm:h-8 sm:w-8">
                    ✓
                  </div>
                )}

                {/* Hover overlay */}

                <div className="absolute inset-0 hidden flex-col justify-end bg-black/0 p-5 text-white opacity-0 transition duration-300 group-hover:bg-[#000080]/60 group-hover:opacity-100 sm:flex">

                  <div>
                    <h2 className="font-[family-name:var(--font-pixelify)] text-sm">
                      {
                        album.title
                      }
                    </h2>

                    <p className="mt-1 text-sm text-white/70">
                      {
                        album.artist
                      }
                    </p>
                  </div>

                </div>

                {/* Delete */}

                <button
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();

                    deleteAlbum(
                      album.id
                    );
                  }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-sm text-black opacity-100 transition active:border-b-white active:border-r-white sm:right-3 sm:top-3 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Delete ${album.title}`}
                >
                  ×
                </button>

              </article>

            )
          )}

        </section>
      )}

      {/* Collage Studio */}

      <section className="mt-10 px-2 pb-4 sm:mt-16 sm:px-0 sm:pb-0">

        {generating && (
          <div className="mb-6">

            <div className="overflow-hidden border-2 border-white border-b-[#808080] border-r-[#808080] bg-[#c0c0c0] p-2">

              <div className="h-full w-1/3 animate-pulse bg-[#000080]" />

            </div>

            <p className="mt-3 text-center text-sm text-neutral-400">
              {t.generating}
            </p>

          </div>
        )}

        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div className="min-w-0">

            <h2 className="font-[family-name:var(--font-pixelify)] text-xl font-semibold sm:text-2xl">
              {t.createCollage}
            </h2>

            <p className="text-[#555555]">
              {selectedAlbums.length}{" "}
              {selectedAlbums.length === 1
                ? t.albumSelected
                : t.albumsSelected}
            </p>

            {selectedAlbums.length >
              gridSize *
                gridSize && (
              <p className="mt-2 text-sm text-amber-600">
                You selected{" "}
                {selectedAlbums.length -
                  gridSize *
                    gridSize}{" "}
                extra{" "}
                {selectedAlbums.length -
                  gridSize *
                    gridSize ===
                1
                  ? "album"
                  : "albums"}.
                Only{" "}
                {gridSize *
                  gridSize}{" "}
                will be used.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">

              {[2, 3, 4].map(
                (size) => (

                  <button
                    key={
                      size
                    }
                    onClick={() => {
                      setGridSize(
                        size as
                          | 2
                          | 3
                          | 4
                      );

                      setWallpaperUrl(
                        null
                      );

                      setWallpaperOrder(
                        []
                      );

                      setSwapMode(
                        false
                      );

                      setSwapSource(
                        null
                      );
                    }}
                    className={`shrink-0 border-2 px-4 py-2 text-sm font-medium sm:py-1.5 ${
                      gridSize ===
                      size
                        ? "border-[#404040] bg-[#000080] text-white"
                        : "border-white border-b-black border-r-black bg-[#c0c0c0] text-black"
                    }`}
                  >
                    {
                      size
                    }{" "}
                    ×{" "}
                    {
                      size
                    }
                  </button>

                )
              )}

            </div>

          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:shrink-0">

            <button
              onClick={() =>
                generateWallpaper()
              }
              disabled={
                generating ||
                selectedAlbums.length <
                  gridSize *
                    gridSize
              }
              className="w-full shrink-0 font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-6 py-2 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1.5"
            >
              {generating
                ? t.generating
                : t.generate}
            </button>

            <button
              onClick={
                shuffleWallpaper
              }
              disabled={
                albums.length <
                gridSize *
                  gridSize
              }
              className="w-full shrink-0 font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-6 py-2 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1.5"
            >
              {t.shuffle}
            </button>

            <button
              onClick={downloadWallpaper}
              disabled={!wallpaperUrl}
              className="w-full shrink-0 font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-6 py-2 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1.5"
            >
              {t.download}
            </button>

          </div>

        </div>

        {wallpaperUrl &&
          wallpaperOrder.length >=
            gridSize *
              gridSize && (

          <div>

            <p className="mb-2 text-center text-[#555555] text-sm">
              {t.swapHint}
            </p>

            <div className="w-full overflow-hidden border-2 border-white bg-[#c0c0c0] p-1 shadow-[2px_2px_0_#808080] sm:p-2">

              <div
                className={`grid w-full gap-0 ${
                  gridSize === 2
                    ? "grid-cols-2"
                    : gridSize === 3
                    ? "grid-cols-3"
                    : "grid-cols-4"
                }`}
              >

                {wallpaperOrder
                  .slice(
                    0,
                    gridSize *
                      gridSize
                  )
                  .map(
                    (id) => {

                      const album =
                        albums.find(
                          (
                            album
                          ) =>
                            album.id ===
                            id
                        );

                      if (
                        !album
                      ) {
                        return null;
                      }

                      const isSwapSource =
                        swapSource ===
                        album.id;

                      return (
                        <div
                          key={
                            album.id
                          }
                          onDoubleClick={() => {
                            setSwapMode(
                              true
                            );

                            setSwapSource(
                              album.id
                            );
                          }}
                          onClick={() => {
                            if (
                              swapMode
                            ) {
                              handleSwapClick(
                                album.id
                              );
                            }
                          }}
                          className={`group relative aspect-square cursor-pointer overflow-hidden ${
                            isSwapSource
                              ? "opacity-50"
                              : ""
                          }`}
                        >

                          <img
                            src={
                              album.cover
                            }
                            alt={`${album.title} by ${album.artist}`}
                            className="h-full w-full object-cover"
                          />

                          {isSwapSource && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">

                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-black shadow-sm sm:h-12 sm:w-12 sm:text-2xl">
                                ⇄
                              </div>

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

              </div>

            </div>

          </div>
        )}

      </section>

    </div>

  </main>
  </>

);
}
