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

    const preciseSearch =
      Boolean(
        cleanArtist &&
        cleanTitle
      );

    // --------------------------------
    // Artist + Year
    // --------------------------------

    if (
      !cleanArtist
    ) {
      setError(
        "Please enter an artist name."
      );
      return;
    }

    if (
      !cleanYear &&
      !cleanTitle
    ) {
      setError(
        "Please enter either an album name or a release year."
      );
      return;
    }

    // --------------------------------
    // Clear previous search
    // --------------------------------

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
          data.error ||
            "MusicBrainz search failed."
        );
      }

      const resultReleases =
        data.releases ?? [];

      setReleases(
        resultReleases
      );

      // --------------------------------
      // Match route.ts response
      //
      // route returns:
      // searchMode: "artist-year"
      // searchMode: "artist-album"
      // --------------------------------

      setArtistOnlySearch(
        data.searchMode ===
          "artist-year"
      );

      if (
        !resultReleases.length
      ) {
        setError(
          artistYearSearch
            ? "No releases found for this artist and year."
            : "No matching releases found."
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
          : "Unable to connect to MusicBrainz."
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
    setAddingId(
      release.id
    );

    setError("");

    try {
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
          data.error ||
            "Unable to get album cover."
        );
      }

      const newAlbum: Album = {
        id: Date.now(),

        releaseId:
          data.releaseId,

        title:
          release.title,

        artist:
          release.artist,

        cover:
          data.image,
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
          : "Unable to add album."
      );
    } finally {
      setAddingId(null);
    }
  }

  // -----------------------------
  // Delete album
  // -----------------------------

  function deleteAlbum(
    id: number
  ) {
    setAlbums(
      (currentAlbums) =>
        currentAlbums.filter(
          (album) =>
            album.id !== id
        )
    );
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

  function handleSwapClick(
    id: number
  ) {
    if (swapSource === null) {
      return;
    }

    if (
      swapSource === id
    ) {
      setSwapSource(null);
      setSwapMode(false);
      return;
    }

    setWallpaperOrder(
      (currentOrder) => {
        const newOrder =
          [...currentOrder];

        const firstIndex =
          newOrder.indexOf(
            swapSource
          );

        const secondIndex =
          newOrder.indexOf(id);

        if (
          firstIndex === -1 ||
          secondIndex === -1
        ) {
          return currentOrder;
        }

        [
          newOrder[firstIndex],
          newOrder[secondIndex],
        ] = [
          newOrder[secondIndex],
          newOrder[firstIndex],
        ];

        return newOrder;
      }
    );

    setSwapSource(null);
    setSwapMode(false);
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

                    image.onerror =
                      reject;

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
  // Render
  // -----------------------------

  return (
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="w-[420px] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] shadow-[4px_4px_0_#000]">

            <div className="flex items-center justify-between bg-[#000080] px-2 py-1 text-white">
              <span className="font-[family-name:var(--font-pixelify)] text-sm">
                Welcome to Album Wall
              </span>

              <button
                onClick={() =>
                  setShowWelcome(
                    false
                  )
                }
                className="flex h-4 w-4 items-center justify-center border border-white border-b-black border-r-black bg-[#c0c0c0] text-xs font-bold leading-none text-black"
              >
                ×
              </button>
            </div>

            <div className="p-5">

              <h2 className="font-[family-name:var(--font-pixelify)] text-lg">
                Welcome!
              </h2>

              <div className="mt-4 space-y-2 text-sm">

                <p>
                  <span className="font-bold">
                    1.
                  </span>{" "}
                  Search for an album
                  or artist.
                </p>

                <p>
                  <span className="font-bold">
                    2.
                  </span>{" "}
                  Add albums to your
                  library.
                </p>

                <p>
                  <span className="font-bold">
                    3.
                  </span>{" "}
                  Select albums and
                  create a collage.
                </p>

                <p>
                  <span className="font-bold">
                    4.
                  </span>{" "}
                  Shuffle to generate
                  a random collage🪄.
                </p>

              </div>

              <div className="mt-5 border-2 border-[#808080] border-b-white border-r-white bg-[#e0e0e0] p-3 text-xs">
                Your album library is
                stored locally in your
                browser.
              </div>

              <div className="mt-5 flex justify-end">

                <button
                  onClick={() =>
                    setShowWelcome(
                      false
                    )
                  }
                  className="border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-6 py-1 text-sm font-medium active:border-b-white active:border-r-white"
                >
                  OK
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen bg-[#3a6ea5] p-6 font-sans text-black">

        <div className="mx-auto max-w-7xl border-2 border-white bg-[#c0c0c0] shadow-[4px_4px_0_#000]">

          {/* Header */}

          <header>

            {/* Title Bar */}

            <div className="flex items-center justify-between bg-[#000080] px-2 py-1 font-[family-name:var(--font-pixelify)] text-white">

              <div className="flex items-center gap-2">

                <span className="text-sm">
                  🎵
                </span>

                <span className="text-sm font-medium">
                  Album Wall
                </span>

              </div>

              <div className="flex gap-1 text-black">

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

            <div className="flex gap-5 border-b border-[#808080] bg-[#c0c0c0] px-3 py-1 font-[family-name:var(--font-pixelify)] text-sm text-black">

              <span>
                File
              </span>

              <span>
                Edit
              </span>

              <span>
                View
              </span>

              <span>
                Library
              </span>

              <span>
                Wallpaper
              </span>

              <span>
                Help
              </span>

            </div>

            {/* Add Album */}

            <div className="flex justify-end bg-[#c0c0c0] p-3">

              <button
                onClick={
                  openForm
                }
                className="font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-4 py-1 text-sm text-black active:border-b-white active:border-r-white"
              >
                + Add Album
              </button>

            </div>

          </header>

          {/* Add Album Form */}

          {showForm && (
            <div className="mb-10 border-2 border-white bg-[#c0c0c0] p-6 shadow-[2px_2px_0_#808080]">

              <h2 className="mb-4 text-sm font-bold">
                Add an Album
              </h2>

              {/* Search Inputs */}

              <div className="grid gap-4 md:grid-cols-4">

                {/* Artist */}

                <input
                  type="text"
                  placeholder="Artist"
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
                  className="border-2 border-[#808080] border-r-white border-b-white bg-white px-4 py-3 outline-none focus:border-black"
                />

                {/* Year */}

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Release year"
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
                  className="border-2 border-[#808080] border-r-white border-b-white bg-white px-4 py-3 outline-none focus:border-black"
                />

                {/* Album */}

                <input
                  type="text"
                  placeholder="Album name"
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
                  className="border-2 border-[#808080] border-r-white border-b-white bg-white px-4 py-3 outline-none focus:border-black"
                />

                {/* Search */}

                <button
                  onClick={
                    searchAlbums
                  }
                  disabled={
                    searching
                  }
                  className="font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-5 py-2 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {searching
                    ? "Searching..."
                    : "Search"}
                </button>

              </div>

              {/* Search explanation */}

              <div className="mt-3 text-xs text-neutral-600">

                <p>
                  Artist + year:
                  browse releases
                  without images.
                </p>

                <p>
                  Artist + album:
                  search precisely
                  with album artwork.
                </p>

              </div>

              {/* Error */}

              {error && (
                <p className="mt-4 text-sm text-red-600">
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
                    Searching MusicBrainz...
                  </p>

                </div>
              )}

              {/* Search Results */}

              {releases.length >
                0 && (
                <div className="mt-6">

                  {/* Artist + Year notice */}

                  {artistOnlySearch && (
                    <div className="mb-3 border border-[#808080] bg-[#d8e2ee] px-3 py-2 text-xs text-black">

                      Showing releases
                      from this artist
                      for the selected
                      year. Album artwork
                      is not loaded in this
                      view.

                    </div>
                  )}

                  {/* Results header */}

                  <div className="mb-4">

                    <h3 className="text-sm font-medium text-neutral-500">
                      {artistOnlySearch
                        ? "Available releases"
                        : "Search results"}
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
                          className="flex items-center justify-between border border-[#808080] bg-[#d8e2ee] px-3 py-2"
                        >

                          {/* Album information */}

                          <div className="flex min-w-0 items-center gap-4">

                            {/* Cover */}

                            {release.cover && (
                              <img
                                src={
                                  release.cover
                                }
                                alt={
                                  release.title
                                }
                                className="h-20 w-20 shrink-0 object-cover"
                              />
                            )}

                            {/* Text */}

                            <div className="min-w-0">

                              <p className="font-medium">
                                {
                                  release.title
                                }
                              </p>

                              <p className="mt-1 text-sm text-neutral-500">

                                {
                                  release.artist
                                }

                                {release.date &&
                                  ` · ${release.date}`}

                                {release.country &&
                                  ` · ${release.country}`}

                              </p>

                              {release.disambiguation && (
                                <p className="mt-1 text-xs text-neutral-400">
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
                              className="ml-4 shrink-0 font-[family-name:var(--font-pixelify)] border-2 border-[#808080] bg-[#d4d0c8] px-4 py-1.5 text-sm text-[#404040]"
                            >
                              ✓ Added
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
                              className="ml-4 shrink-0 font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-4 py-1.5 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {addingId ===
                              release.id
                                ? "Adding..."
                                : "Add"}
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
                  className="font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-5 py-1.5 text-sm text-black active:border-b-white active:border-r-white"
                >
                  Cancel
                </button>

              </div>

            </div>
          )}

          {/* Album Library */}

          <div className="mb-4 border-b border-[#808080] bg-[#c0c0c0] px-3 py-2 font-[family-name:var(--font-pixelify)] text-sm">
            Album Library
          </div>

          {/* Album Grid */}

          {albums.length ===
          0 ? (

            <div className="py-20 text-center">

              <p className="text-lg text-neutral-400">
                Empty
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
                      <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-sm font-bold text-black">
                        ✓
                      </div>
                    )}

                    {/* Hover overlay */}

                    <div className="absolute inset-0 flex flex-col justify-end bg-black/0 p-5 text-white opacity-0 transition duration-300 group-hover:bg-[#000080]/60 group-hover:opacity-100">

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
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-sm text-black opacity-0 transition group-hover:opacity-100 active:border-b-white active:border-r-white"
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

          <section className="mt-16">

            {generating && (
              <div className="mb-6">

                <div className="overflow-hidden border-2 border-white border-b-[#808080] border-r-[#808080] bg-[#c0c0c0] p-2">

                  <div className="h-full w-1/3 animate-pulse bg-[#000080]" />

                </div>

                <p className="mt-3 text-center text-sm text-neutral-400">
                  Generating...
                </p>

              </div>
            )}

            <div className="mb-6 flex items-end justify-between">

              <div>

                <h2 className="font-[family-name:var(--font-pixelify)] text-2xl font-semibold">
                  Create your collage
                </h2>

                <p className="mt-1 text-sm text-neutral-400">
                  {
                    selectedAlbums.length
                  }{" "}
                  albums selected
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

                <div className="mt-4 flex gap-2">

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
                        className={`border-2 px-4 py-1.5 text-sm font-medium ${
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

              <div className="flex gap-2">

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
                  className="font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-6 py-1.5 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating
                    ? "Generating..."
                    : "Generate"}
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
                  className="font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-6 py-1.5 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  🎲 Shuffle
                </button>

                <button
                  onClick={() => {
                    if (
                      !wallpaperUrl
                    ) {
                      return;
                    }

                    const link =
                      document.createElement(
                        "a"
                      );

                    link.href =
                      wallpaperUrl;

                    link.download =
                      "album-wall.png";

                    link.click();
                  }}
                  disabled={
                    !wallpaperUrl
                  }
                  className="font-[family-name:var(--font-pixelify)] border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-6 py-1.5 text-sm text-black active:border-b-white active:border-r-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download
                </button>

              </div>

            </div>

            {wallpaperUrl &&
              wallpaperOrder.length >=
                gridSize *
                  gridSize && (

              <div className="overflow-hidden border-2 border-white bg-[#c0c0c0] p-2 shadow-[2px_2px_0_#808080]">

                <div
                  className={`grid gap-0 ${
                    gridSize ===
                    2
                      ? "grid-cols-2"
                      : gridSize ===
                        3
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

                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl text-black shadow-sm">
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
            )}

          </section>

        </div>

      </main>
    </>
  );
}
