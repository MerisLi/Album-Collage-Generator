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

async function getCoverUrl(
  id: string
): Promise<string | null> {
  // --------------------------------------------------
  // Step 1: Get release metadata from MusicBrainz
  // --------------------------------------------------

  let releaseTitle: string | null = null;
  let artistName: string | null = null;

  try {
    const musicBrainzUrl =
      `https://musicbrainz.org/ws/2/release/${encodeURIComponent(id)}` +
      `?fmt=json&inc=artists`;

    const response = await fetch(
      musicBrainzUrl,
      {
        headers: {
          "User-Agent":
            "AlbumWall/0.1.0 (album-wall)",
          Accept: "application/json",
        },
        cache: "force-cache",
      }
    );

    if (response.ok) {
      const release =
        await response.json();

      releaseTitle =
        release.title ?? null;

      artistName =
        release["artist-credit"]?.[0]
          ?.name ??
        release["artist-credit"]?.[0]
          ?.artist?.name ??
        null;
    }
  } catch (error) {
    console.error(
      "MusicBrainz metadata error:",
      error
    );
  }

  // --------------------------------------------------
  // Step 2: Apple / iTunes
  // --------------------------------------------------

  if (releaseTitle && artistName) {
    try {
      const term =
        `${artistName} ${releaseTitle}`;

      const appleUrl =
        `https://itunes.apple.com/search?` +
        `term=${encodeURIComponent(term)}` +
        `&entity=album` +
        `&limit=10`;

      const appleResponse =
        await fetch(appleUrl, {
          cache: "force-cache",
        });

      if (appleResponse.ok) {
        const appleData:
          AppleSearchResponse =
          await appleResponse.json();

        const results =
          appleData.results ?? [];

        const normalizedTitle =
          releaseTitle
            .toLowerCase()
            .trim();

        const normalizedArtist =
          artistName
            .toLowerCase()
            .trim();

        const match =
          results.find((result) => {
            const resultTitle =
              result.collectionName
                ?.toLowerCase()
                .trim();

            const resultArtist =
              result.artistName
                ?.toLowerCase()
                .trim();

            return (
              resultTitle ===
                normalizedTitle &&
              resultArtist ===
                normalizedArtist
            );
          });

        const album =
          match ?? results[0];

        if (album?.artworkUrl100) {
          return album.artworkUrl100.replace(
            /100x100bb/,
            "1200x1200bb"
          );
        }
      }
    } catch (error) {
      console.error(
        "Apple artwork error:",
        error
      );
    }
  }

  // --------------------------------------------------
  // Step 3: Cover Art Archive fallback
  // --------------------------------------------------

  try {
    const coverArtUrl =
      `https://coverartarchive.org/release/${encodeURIComponent(id)}`;

    const controller =
      new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    try {
      const response =
        await fetch(coverArtUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "AlbumWall/0.1.0 (album-wall)",
            Accept:
              "application/json",
          },
          cache: "force-cache",
        });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        return null;
      }

      const data =
        await response.json();

      const images:
        CoverArtImage[] =
        data.images ?? [];

      const frontImage =
        images.find(
          (image) =>
            image.front === true
        );

      return (
        frontImage?.thumbnails?.[
          "1200"
        ] ??
        frontImage?.image ??
        null
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error(
      "Cover Art Archive error:",
      error
    );

    return null;
  }
}

async function proxyImage(
  imageUrl: string
): Promise<Response> {
  try {
    const response = await fetch(
      imageUrl,
      {
        cache: "force-cache",
        headers: {
          "User-Agent":
            "AlbumWall/0.1.0 (album-wall)",
          Accept:
            "image/avif,image/webp,image/jpeg,image/png,*/*",
        },
      }
    );

    if (!response.ok) {
      return new Response(
        "Image unavailable",
        {
          status: 502,
        }
      );
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) ?? "image/jpeg";

    return new Response(
      response.body,
      {
        status: 200,
        headers: {
          "Content-Type":
            contentType,

          // Cache image aggressively.
          "Cache-Control":
            "public, max-age=31536000, immutable",

          "Access-Control-Allow-Origin":
            "*",
        },
      }
    );
  } catch (error) {
    console.error(
      "Image proxy error:",
      error
    );

    return new Response(
      "Image unavailable",
      {
        status: 502,
      }
    );
  }
}

export async function GET(
  request: Request
) {
  const { searchParams } =
    new URL(request.url);

  const id =
    searchParams.get("id");

  const format =
    searchParams.get("format");

  if (!id) {
    return Response.json(
      {
        error:
          "Release ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    // --------------------------------------------------
    // Find artwork URL
    // --------------------------------------------------

    const imageUrl =
      await getCoverUrl(id);

    if (!imageUrl) {
      return Response.json(
        {
          error:
            "coverNotFound",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------
    // Image proxy mode
    //
    // Browser receives the image directly
    // from album-collage.top instead of
    // directly from Apple / CAA.
    // --------------------------------------------------

    if (format === "image") {
      return proxyImage(
        imageUrl
      );
    }

    // --------------------------------------------------
    // Normal JSON mode
    //
    // Keep compatibility with existing frontend.
    // The returned image URL is now SAME-ORIGIN.
    // --------------------------------------------------

    const baseUrl =
      new URL(request.url).origin;

    const proxiedUrl =
      `${baseUrl}/api/album-cover?id=${encodeURIComponent(id)}&format=image`;

    return Response.json(
      {
        image: proxiedUrl,
        thumbnail: proxiedUrl,
        large: proxiedUrl,
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400",
        },
      }
    );
  } catch (error) {
    console.error(
      "Cover Art route error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to retrieve album artwork.",
      },
      {
        status: 500,
      }
    );
  }
}

