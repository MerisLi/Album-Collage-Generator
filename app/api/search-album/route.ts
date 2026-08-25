export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title")?.trim() ?? "";
  const artist = searchParams.get("artist")?.trim() ?? "";
  const year = searchParams.get("year")?.trim() ?? "";

  // ---------------------------------
  // Validate search mode
  // ---------------------------------

  // Mode 1:
  // Artist + Year
  //
  // Mode 2:
  // Artist + Album
  //

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

  if (!year && !title) {
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

  // ---------------------------------
  // Normalize artist for fuzzy matching
  // ---------------------------------

  function normalizeArtist(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\-_]+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

  const normalizedArtist = normalizeArtist(artist);

  // ---------------------------------
  // Build MusicBrainz query
  // ---------------------------------

  let query = "";

  // ---------------------------------
  // MODE 1
  // Artist + Year
  // ---------------------------------

  if (!title && year) {
  query =
    `${artist} AND date:[${year}-01-01 TO ${year}-12-31]`;
}

  // ---------------------------------
  // MODE 2
  // Artist + Album
  // ---------------------------------

  if (title && !year) {
    query =
      `release:"${title}" AND artist:"${artist}"`;
  }

  // ---------------------------------
  // If both are provided
  // Album search takes priority
  // ---------------------------------

  if (title && year) {
    query =
      `release:"${title}" AND artist:"${artist}"`;
  }

  const url =
    `https://musicbrainz.org/ws/2/release/` +
    `?query=${encodeURIComponent(query)}` +
    `&fmt=json` +
    `&limit=100`;

  // ---------------------------------
  // Get album cover
  // ONLY used for precise album search
  // ---------------------------------

  async function getCover(releaseId: string) {
    try {
      const response = await fetch(
        `https://coverartarchive.org/release/${releaseId}`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return (
        data.images?.[0]?.thumbnails?.large ??
        data.images?.[0]?.image ??
        null
      );
    } catch {
      return null;
    }
  }

  // ---------------------------------
  // Search MusicBrainz
  // ---------------------------------

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "AlbumWall/0.1.0 (album-wall)",
        Accept: "application/json",
      },

      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        "MusicBrainz error:",
        response.status
      );

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

    const releases = [];

    // ---------------------------------
    // Determine search mode
    // ---------------------------------

    const artistYearSearch =
      Boolean(!title && year);

    const preciseSearch =
      Boolean(title);

    // ---------------------------------
    // Process results
    // ---------------------------------

    for (const release of results) {
      // -------------------------------
      // Only Albums and EPs
      // -------------------------------

      const type =
        release["release-group"]?.[
          "primary-type"
        ];

      if (
        type &&
        type !== "Album" &&
        type !== "EP"
      ) {
        continue;
      }

      // -------------------------------
      // Get artist
      // -------------------------------

      const releaseArtist =
        release["artist-credit"]
          ?.map((a: any) => a.name)
          .join(", ") ?? artist;

      // -------------------------------
      // Additional fuzzy artist check
      // -------------------------------

      const normalizedReleaseArtist =
        normalizeArtist(releaseArtist);

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

      // -------------------------------
      // Year filtering
      // -------------------------------

      if (year) {
        const releaseYear =
          release.date?.slice(0, 4);

        if (releaseYear !== year) {
          continue;
        }
      }

      // --------------------------------
      // IMPORTANT:
      // Artist + Year
      // DO NOT FETCH COVER
      // --------------------------------

      if (artistYearSearch) {
        releases.push({
          id: release.id,

          title: release.title,

          artist: releaseArtist,

          date:
            release.date ??
            null,

          country:
            release.country ??
            null,

          status:
            release.status ??
            null,

          type:
            type ??
            null,

          disambiguation:
            release.disambiguation ??
            null,

          cover: null,
        });

        continue;
      }

      // --------------------------------
      // Artist + Album
      // FETCH COVER
      // --------------------------------

      const cover =
        await getCover(release.id);

      releases.push({
        id: release.id,

        title:
          release.title,

        artist:
          releaseArtist,

        date:
          release.date ??
          null,

        country:
          release.country ??
          null,

        status:
          release.status ??
          null,

        type:
          type ??
          null,

        disambiguation:
          release.disambiguation ??
          null,

        cover,
      });

      // --------------------------------
      // Precise search:
      // 50 results maximum
      // --------------------------------

      if (releases.length >= 50) {
        break;
      }
    }

    // ---------------------------------
    // Sort artist + year results
    // ---------------------------------

    if (artistYearSearch) {
      releases.sort((a: any, b: any) => {
        const titleA =
          a.title.toLowerCase();

        const titleB =
          b.title.toLowerCase();

        return titleA.localeCompare(
          titleB
        );
      });
    }

    return Response.json({
      releases,

      searchMode:
        artistYearSearch
          ? "artist-year"
          : preciseSearch
          ? "artist-album"
          : "unknown",

      artistOnly: false,
    });
  } catch (error) {
    console.error(
      "Search failed:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to connect to MusicBrainz.",
      },
      {
        status: 500,
      }
    );
  }
}
