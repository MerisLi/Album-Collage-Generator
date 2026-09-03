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
  disambiguation: string | null;
  cover: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const title =
    searchParams.get("title")?.trim() ?? "";

  const artist =
    searchParams.get("artist")?.trim() ?? "";

  const year =
    searchParams.get("year")?.trim() ?? "";

  // -----------------------------
  // Validate
  // -----------------------------

  if (!artist) {
    return Response.json(
      {
        error: "Please enter an artist name.",
      },
      {
        status: 400,
      }
    );
  }

  if (!title && !year) {
    return Response.json(
      {
        error:
          "Please enter either an album name or a release year.",
      },
      {
        status: 400,
      }
    );
  }

  // -----------------------------
  // Normalize
  // -----------------------------

  function normalizeText(value: string) {
    return value
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[\s\-_（）()【】[\]]+/g, "")
      .replace(/[^\p{L}\p{N}]/gu, "");
  }

  const convertedArtist = converter(artist);

  const convertedTitle = title
    ? converter(title)
    : "";

  const normalizedArtist =
    normalizeText(convertedArtist);

  const normalizedTitle = convertedTitle
    ? normalizeText(convertedTitle)
    : "";

  // -----------------------------
  // Search mode
  // -----------------------------

  const artistYearSearch =
    Boolean(!title && year);

  // -----------------------------
  // Build MusicBrainz query
  // -----------------------------

  let query = "";

  if (artistYearSearch) {
    query =
      `artist:"${convertedArtist}" AND date:[${year}-01-01 TO ${year}-12-31]`;
  } else {
    query =
      `(${convertedTitle} OR ${title}) AND (${convertedArtist} OR ${artist})`;
  }

  /*
   * Artist + year searches can return a very large
   * number of different physical / regional versions.
   *
   * We only need enough releases to identify the
   * distinct release groups.
   */
  const limit = artistYearSearch ? 20 : 20;

  const url =
    "https://musicbrainz.org/ws/2/release/" +
    `?query=${encodeURIComponent(query)}` +
    "&fmt=json" +
    `&limit=${limit}`;

  // -----------------------------
  // Search MusicBrainz
  // -----------------------------

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 20000);

    let response: Response;

    try {
      /*
       * IMPORTANT:
       *
       * Use force-cache here.
       *
       * The same artist / album / year search can
       * safely be cached because MusicBrainz data
       * does not need to be fetched on every click.
       */
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "AlbumWall/0.1.0 (album-wall)",
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "force-cache",
        next: {
          revalidate: 86400,
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return Response.json(
        {
          error:
            "MusicBrainz request failed.",
        },
        {
          status: response.status,
        }
      );
    }

    const data = await response.json();

    const results = data.releases ?? [];

    const releases: ReleaseResult[] = [];

    // -----------------------------
    // Prevent duplicate release groups
    // -----------------------------

    const seenReleaseGroups =
      new Set<string>();

    // -----------------------------
    // Process releases
    // -----------------------------

    for (const release of results) {
      const type =
        release["release-group"]?.[
          "primary-type"
        ];

      // Only keep Albums and EPs
      if (
        type &&
        type !== "Album" &&
        type !== "EP"
      ) {
        continue;
      }

      const releaseArtist =
        release["artist-credit"]
          ?.map((a: { name: string }) => a.name)
          .join(", ") ?? artist;

      const normalizedReleaseArtist =
        normalizeText(releaseArtist);

      const artistMatches =
        normalizedReleaseArtist.includes(
          normalizedArtist
        ) ||
        normalizedArtist.includes(
          normalizedReleaseArtist
        );

      if (!artistMatches) {
        continue;
      }

      // -----------------------------
      // Title matching
      // -----------------------------

      if (title) {
        const normalizedReleaseTitle =
          normalizeText(
            converter(release.title)
          );

        const titleMatches =
          normalizedReleaseTitle.includes(
            normalizedTitle
          ) ||
          normalizedTitle.includes(
            normalizedReleaseTitle
          );

        if (!titleMatches) {
          continue;
        }
      }

      // -----------------------------
      // Year matching
      // -----------------------------

      if (year) {
        const releaseYear =
          release.date?.slice(0, 4);

        if (releaseYear !== year) {
          continue;
        }
      }

      // -----------------------------
      // Deduplicate release groups
      // -----------------------------

      const releaseGroupId =
        release["release-group"]?.id;

      if (releaseGroupId) {
        if (
          seenReleaseGroups.has(
            releaseGroupId
          )
        ) {
          continue;
        }

        seenReleaseGroups.add(
          releaseGroupId
        );
      }

      // -----------------------------
      // Return metadata only
      // -----------------------------

      releases.push({
        id: release.id,

        title: release.title,

        artist: releaseArtist,

        date:
          release.date ?? null,

        country:
          release.country ?? null,

        status:
          release.status ?? null,

        type:
          type ?? null,

        disambiguation:
          release.disambiguation ?? null,

        cover: null,
      });
    }

    // -----------------------------
    // Sort artist + year results
    // -----------------------------

    if (artistYearSearch) {
      releases.sort((a, b) => {
        return a.title.localeCompare(
          b.title
        );
      });
    }

    // -----------------------------
    // Response
    // -----------------------------

    return Response.json(
      {
        releases,

        searchMode:
          artistYearSearch
            ? "artist-year"
            : "artist-album",

        artistOnly: false,
      },
      {
        headers: {
          /*
           * Let Vercel cache the final API response.
           *
           * 1 hour browser/CDN cache,
           * stale content can still be served
           * while a new response is generated.
           */
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error(
      "Search failed:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}

