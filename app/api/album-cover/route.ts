export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const id = searchParams.get("id");

  if (!id) {
    return Response.json(
      { error: "Release ID is required." },
      { status: 400 }
    );
  }

  const url = `https://coverartarchive.org/release/${id}`;

  try {
    const response = await fetch(url);

    console.log("Cover Art status:", response.status);
    console.log("Cover Art final URL:", response.url);

    // Release exists in MusicBrainz,
    // but Cover Art Archive may not have artwork for it.
    if (response.status === 404) {
      return Response.json(
        {
          error:
            "No cover art is available for this release.",
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

    const frontImage = data.images?.find(
      (image: any) => image.front === true
    );

    if (!frontImage) {
      return Response.json(
        {
          error:
            "No front cover is available for this release.",
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
  } catch (error) {
    console.error("Cover Art error:", error);

    return Response.json(
      {
        error: "Unable to connect to Cover Art Archive.",
        details: String(error),
      },
      { status: 500 }
    );
  }
}