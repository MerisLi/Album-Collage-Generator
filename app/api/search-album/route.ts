import { NextResponse } from "next/server";
import OpenCC from "opencc-js";

const converter = OpenCC.Converter({
  from: "cn",
  to: "tw",
});

type ReleaseResult = {
  id: string;
  title: string;
  artist: string;
  date: string | null;
  country: string | null;
  status: string | null;
  type: string | null;
  cover: string | null;
};

type AppleResult = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  releaseDate?: string;
  artworkUrl100?: string;
};

type MusicBrainzRelease = {
  id: string;
  title: string;
  date?: string;
  country?: string;
  status?: string;
  "release-group"?: {
    "primary-type"?: string;
  };
  "artist-credit"?: Array<{
    name?: string;
    artist?: {
      name?: string;
    };
  }>;
};

function normalizeText(text: string) {
  return converter(text)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-‒–—―]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function getYear(date: string | null | undefined) {
  if (!date) return null;

  const match = date.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function normalizeArtworkUrl(url: string | undefined) {
  if (!url) return null;

  return url
    .replace("100x100", "1000x1000")
    .replace("100x100bb", "1000x1000bb");
}

async function searchMusicBrainz(
  artist: string,
  title: string,
  year: string,
): Promise<ReleaseResult[]> {
  const artistQuery = normalizeText(artist);
  const titleQuery = normalizeText(title);

  let query = `artist:"${artist}"`;

  if (title) {
    query += ` AND release:"${title}"`;
  }

  if (year) {
    query += ` AND date:${year}`;
  }

  const url = new URL("https://musicbrainz.org/ws/2/release/");
  url.searchParams.set("query", query);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "100");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "AlbumWall/0.1.0 (album-wall)",
      },
      cache: "force-cache",
      next: {
        revalidate: 86400,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`MusicBrainz returned ${response.status}`);
    }

    const data = await response.json();

    const releases = Array.isArray(data.releases) ? data.releases : [];

    return releases
      .filter((release: MusicBrainzRelease) => {
        const types = release["release-group"]?.["primary-type"];

        return (
          types === "Album" ||
          types === "EP" ||
          types === "Single"
        );
      })
      .filter((release: MusicBrainzRelease) => {
        const releaseArtist =
          release["artist-credit"]?.[0]?.name ||
          release["artist-credit"]?.[0]?.artist?.name ||
          "";

        const releaseTitle = release.title || "";

        const artistMatches =
          !artistQuery ||
          normalizeText(releaseArtist).includes(artistQuery) ||
          artistQuery.includes(normalizeText(releaseArtist));

        const titleMatches =
          !titleQuery ||
          normalizeText(releaseTitle).includes(titleQuery) ||
          titleQuery.includes(normalizeText(releaseTitle));

        const releaseYear = getYear(release.date);

        const yearMatches =
          !year || releaseYear === Number(year);

        return artistMatches && titleMatches && yearMatches;
      })
      .map((release: MusicBrainzRelease): ReleaseResult => {
        const releaseArtist =
          release["artist-credit"]?.[0]?.name ||
          release["artist-credit"]?.[0]?.artist?.name ||
          artist;

        return {
          id: release.id,
          title: release.title,
          artist: releaseArtist,
          date: release.date || null,
          country: release.country || null,
          status: release.status || null,
          type:
            release["release-group"]?.["primary-type"] ||
            null,
          cover: null,
        };
      });
  } finally {
    clearTimeout(timeout);
  }
}

async function searchApple(
  artist: string,
  title: string,
  year: string,
): Promise<ReleaseResult[]> {
  const url = new URL("https://itunes.apple.com/search");

  url.searchParams.set(
    "term",
    [artist, title].filter(Boolean).join(" "),
  );
  url.searchParams.set("entity", "album");
  url.searchParams.set("country", "US");
  url.searchParams.set("limit", "200");

  const response = await fetch(url.toString(), {
    cache: "force-cache",
    next: {
      revalidate: 86400,
    },
  });

  if (!response.ok) {
    throw new Error(`Apple Search returned ${response.status}`);
  }

  const data = await response.json();

  const results: AppleResult[] = Array.isArray(data.results)
    ? data.results
    : [];

  const normalizedArtist = normalizeText(artist);
  const normalizedTitle = normalizeText(title);

  return results
    .filter((item) => {
      const itemArtist = normalizeText(item.artistName || "");
      const itemTitle = normalizeText(item.collectionName || "");

      const artistMatches =
        !normalizedArtist ||
        itemArtist.includes(normalizedArtist) ||
        normalizedArtist.includes(itemArtist);

      const titleMatches =
        !normalizedTitle ||
        itemTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(itemTitle);

      const itemYear = getYear(item.releaseDate);

      const yearMatches =
        !year || itemYear === Number(year);

      return artistMatches && titleMatches && yearMatches;
    })
    .map(
      (item): ReleaseResult => ({
        id: `apple-${item.collectionId}`,
        title: item.collectionName,
        artist: item.artistName,
        date: item.releaseDate
          ? item.releaseDate.slice(0, 10)
          : null,
        country: null,
        status: null,
        type: null,
        cover: normalizeArtworkUrl(item.artworkUrl100),
      }),
    );
}

function isSameRelease(
  a: ReleaseResult,
  b: ReleaseResult,
) {
  const artistA = normalizeText(a.artist);
  const artistB = normalizeText(b.artist);

  const titleA = normalizeText(a.title);
  const titleB = normalizeText(b.title);

  const artistMatches =
    artistA === artistB ||
    artistA.includes(artistB) ||
    artistB.includes(artistA);

  const titleMatches =
    titleA === titleB ||
    titleA.includes(titleB) ||
    titleB.includes(titleA);

  return artistMatches && titleMatches;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const artist = searchParams.get("artist")?.trim() || "";
  const title = searchParams.get("title")?.trim() || "";
  const year = searchParams.get("year")?.trim() || "";

  if (!artist) {
    return NextResponse.json(
      { error: "artistRequired" },
      { status: 400 },
    );
  }

  if (!title && !year) {
    return NextResponse.json(
      { error: "titleOrYearRequired" },
      { status: 400 },
    );
  }

  const artistYearSearch = !title && Boolean(year);

  const [musicBrainzResult, appleResult] =
    await Promise.allSettled([
      searchMusicBrainz(artist, title, year),
      searchApple(artist, title, year),
    ]);

  const musicBrainzReleases =
    musicBrainzResult.status === "fulfilled"
      ? musicBrainzResult.value
      : [];

  const appleReleases =
    appleResult.status === "fulfilled"
      ? appleResult.value
      : [];

  const mergedReleases: ReleaseResult[] = [
    ...musicBrainzReleases,
  ];

  /*
   * Add Apple's artwork to matching MusicBrainz releases.
   * If MusicBrainz has no matching release, keep the Apple result
   * as an Apple-only fallback.
   */
  for (const appleRelease of appleReleases) {
    const existingIndex = mergedReleases.findIndex(
      (release) => isSameRelease(release, appleRelease),
    );

    if (existingIndex !== -1) {
      if (
        !mergedReleases[existingIndex].cover &&
        appleRelease.cover
      ) {
        mergedReleases[existingIndex] = {
          ...mergedReleases[existingIndex],
          cover: appleRelease.cover,
        };
      }
    } else {
      mergedReleases.push(appleRelease);
    }
  }

  /*
   * Final deduplication.
   * This prevents slightly different API results from producing
   * multiple copies of the same album.
   */
  const uniqueReleases: ReleaseResult[] = [];

  for (const release of mergedReleases) {
    const duplicate = uniqueReleases.some((existing) =>
      isSameRelease(existing, release),
    );

    if (!duplicate) {
      uniqueReleases.push(release);
    }
  }

  return NextResponse.json(
    {
      releases: uniqueReleases,
      searchMode: artistYearSearch
        ? "artist-year"
        : "artist-album",
      artistOnly: false,
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
