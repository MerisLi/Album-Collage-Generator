type AppleAlbumResult = {
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
};

type AppleSearchResponse = {
  results?: AppleAlbumResult[];
};

type CoverArtImage = {
  front?: boolean;
  image?: string;
  thumbnails?: {
    ["500"]?: string;
    ["1200"]?: string;
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const id = searchParams.get("id");

  if (!id) {
    return Response.json(
      { error: "Release ID is required." },
      { status: 400 }
    );
  }

  /*
   * 1. Get release metadata from MusicBrainz
   * 2. Search Apple/iTunes for the album artwork
   * 3. Fall back to Cover Art Archive if Apple fails
   */

  try {
    // --------------------------------------------------
    // Step 1: Get release metadata from MusicBrainz
    // --------------------------------------------------

    let releaseTitle: string | null = null;
    let artistName: string | null = null;

    try {
      const musicBrainzUrl =
        `https://musicbrainz.org/ws/2/release/${encodeURIComponent(id)}` +
        `?fmt=json&inc=artists`;

      const musicBrainzResponse = await fetch(musicBrainzUrl, {
        headers: {
          "User-Agent": "AlbumWall/0.1.0 (album-wall)",
        },
      });

      if (musicBrainzResponse.ok) {
        const release = await musicBrainzResponse.json();

        releaseTitle = release.title ?? null;

        artistName =
          release["artist-credit"]?.[0]?.name ??
          release["artist-credit"]?.[0]?.artist?.name ??
          null;

        console.log("MusicBrainz release:", {
          title: releaseTitle,
          artist: artistName,
        });
      }
    } catch (error) {
      console.error("MusicBrainz metadata error:", error);
    }

    // --------------------------------------------------
    // Step 2: Search Apple/iTunes for artwork
    // --------------------------------------------------

    if (releaseTitle && artistName) {
      try {
        const term = `${artistName} ${releaseTitle}`;

        const appleUrl =
          `https://itunes.apple.com/search?` +
          `term=${encodeURIComponent(term)}` +
          `&entity=album` +
          `&limit=10`;

        const appleResponse = await fetch(appleUrl);

        console.log("Apple Search status:", appleResponse.status);

        if (appleResponse.ok) {
          const appleData: AppleSearchResponse =
            await appleResponse.json();

          const results = appleData.results ?? [];

          // Try to find the closest album + artist match.
          const normalizedTitle = releaseTitle
            .toLowerCase()
            .trim();

          const normalizedArtist = artistName
            .toLowerCase()
            .trim();

          const match = results.find((result) => {
            const resultTitle =
              result.collectionName?.toLowerCase().trim();

            const resultArtist =
              result.artistName?.toLowerCase().trim();

            return (
              resultTitle === normalizedTitle &&
              resultArtist === normalizedArtist
            );
          });

          // If exact match isn't available, use the first album result.
          const album = match ?? results[0];

          if (album?.artworkUrl100) {
            const artwork = album.artworkUrl100.replace(
              /100x100bb/,
              "1200x1200bb"
            );

            console.log("Apple artwork found:", artwork);

            return Response.json({
              image: artwork,
              thumbnail: artwork,
              large: artwork,
            });
          }
        }
      } catch (error) {
        console.error("Apple artwork error:", error);
      }
    }

    // --------------------------------------------------
    // Step 3: Cover Art Archive fallback
    // --------------------------------------------------

    console.log("Apple artwork unavailable. Trying Cover Art Archive...");

    const coverArtUrl =
      `https://coverartarchive.org/release/${encodeURIComponent(id)}`;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    try {
      const response = await fetch(coverArtUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      console.log("Cover Art status:", response.status);
      console.log("Cover Art final URL:", response.url);

      if (response.status === 404) {
        return Response.json(
          {
            error: "coverNotFound",
          },
          { status: 404 }
        );
      }

      if (!response.ok) {
        return Response.json(
          {
            error:
              "Unable to retrieve cover art for this release.",
          },
          { status: response.status }
        );
      }

     const data = await response.json();

    const images: CoverArtImage[] = data.images ?? [];

    const frontImage = images.find(
      (image) => image.front === true
    );

      if (!frontImage) {
        return Response.json(
          {
            error: "coverNotFound",
          },
          { status: 404 }
        );
      }

      return Response.json({
        image: frontImage.image,
        thumbnail:
          frontImage.thumbnails?.["500"] ??
          frontImage.image,
        large:
          frontImage.thumbnails?.["1200"] ??
          frontImage.image,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("Cover Art route error:", error);

    return Response.json(
      {
        error: "Unable to retrieve album artwork.",
        details: String(error),
      },
      { status: 500 }
    );
  }
}