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

  const { searchParams } =
    new URL(request.url);


  const title =
    searchParams
      .get("title")
      ?.trim() ?? "";


  const artist =
    searchParams
      .get("artist")
      ?.trim() ?? "";


  const year =
    searchParams
      .get("year")
      ?.trim() ?? "";



  // -----------------------------
  // Validate
  // -----------------------------


  if (!artist) {

    return Response.json(
      {
        error:
          "Please enter an artist name.",
      },
      {
        status:400,
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
        status:400,
      }
    );

  }



  // -----------------------------
  // Normalize
  // -----------------------------


  function normalizeText(
    value:string
  ) {

    return value
      .toLowerCase()
      .normalize("NFKC")
      .replace(
        /[\s\-_（）()【】[\]]+/g,
        ""
      )
      .replace(
        /[^\p{L}\p{N}]/gu,
        "");

  }



  const convertedArtist =
    converter(artist);


  const convertedTitle =
    title
      ? converter(title)
      : "";



  const normalizedArtist =
    normalizeText(
      convertedArtist
    );


  const normalizedTitle =
    convertedTitle
      ? normalizeText(
          convertedTitle
        )
      : "";



  // -----------------------------
  // Build query
  // -----------------------------


  let query = "";



  if (!title && year) {

    query =
      `${convertedArtist} AND date:[${year}-01-01 TO ${year}-12-31]`;

  }



  if (title) {

    query =
    `(${convertedTitle} OR ${title}) AND (${convertedArtist} OR ${artist})`;

  }



  const url =
    "https://musicbrainz.org/ws/2/release/" +
    `?query=${encodeURIComponent(query)}` +
    "&fmt=json" +
    "&limit=30";



  // -----------------------------
  // Cover
  // -----------------------------


  async function getCover(
    releaseId:string
  ) {

    try {

      const response =
        await fetch(
          `https://coverartarchive.org/release/${releaseId}`,
          {
            headers:{
            "User-Agent":
              "AlbumWall/0.1.0 (album-wall)",
            Accept:
              "application/json",
          },
            cache:
              "no-store",
          }
        );


      if(!response.ok){

        return null;

      }


      const data =
        await response.json();


      return (
        data.images?.[0]
          ?.thumbnails
          ?.large ??
        data.images?.[0]
          ?.image ??
        null
      );


    } catch {

      return null;

    }

  }



  // -----------------------------
  // Search MusicBrainz
  // -----------------------------


  try {


    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        8000
      );

    const response =
      await fetch(url, {
        headers:{
          "User-Agent":
            "AlbumWall/0.1.0 (album-wall)",
          Accept:
            "application/json",
        },
        signal:
          controller.signal,
        cache:
          "no-store",
      });

clearTimeout(timeout);



    if(!response.ok){

      return Response.json(
        {
          error:
            "MusicBrainz request failed.",
        },
        {
          status:
            response.status,
        }
      );

    }



    const data =
      await response.json();



    const results =
      data.releases ?? [];



    const releases:
      ReleaseResult[] = [];



    const coverTasks:
      Promise<ReleaseResult | null>[] = [];



    const artistYearSearch =
      Boolean(
        !title && year
      );



    // -----------------------------
    // Process
    // -----------------------------


    for(
      const release of results.slice(0,30)
    ){


      const type =
        release[
          "release-group"
        ]
        ?.[
          "primary-type"
        ];



      if(
        type &&
        type !== "Album" &&
        type !== "EP"
      ){

        continue;

      }



      const releaseArtist =
        release[
          "artist-credit"
        ]
        ?.map(
          (a:any)=>a.name
        )
        .join(", ")
        ??
        artist;



      const normalizedReleaseArtist =
      normalizeText(
        releaseArtist
      );

    
      const artistMatches =
        normalizedReleaseArtist.includes(
          normalizedArtist
        )
        ||
        normalizedArtist.includes(
          normalizedReleaseArtist
        );



      if(!artistMatches){

        continue;

      }



      if(title){

        const normalizedReleaseTitle =
          normalizeText(
            converter(
              release.title
            )
          );



        const titleMatches =
          normalizedReleaseTitle.includes(
            normalizedTitle
          )
          ||
          normalizedTitle.includes(
            normalizedReleaseTitle
          );



        if(!titleMatches){

          continue;

        }

      }



      if(year){

        const releaseYear =
          release.date
          ?.slice(0,4);



        if(
          releaseYear !== year
        ){

          continue;

        }

      }

            // -----------------------------
      // Artist + Year
      // no cover
      // -----------------------------

      if (artistYearSearch) {


        releases.push({

          id:
            release.id,

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

          cover:
            null,

        });


        continue;

      }



      // -----------------------------
      // Artist + Album
      // cover parallel
      // -----------------------------


      coverTasks.push(

        getCover(
          release.id
        )
        .then(
          (cover)=>(

            cover
              ? {

                  id:
                    release.id,

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

                }
              : null

          ))

      );


    }



    // -----------------------------
    // Wait covers
    // -----------------------------


    if(!artistYearSearch){


      const coverResults =
        await Promise.all(
          coverTasks
        );



      releases.push(
        ...coverResults
          .filter(
            (
              item
            ): item is ReleaseResult =>
              item !== null
          )
          .slice(
            0,
            50
          )
      );


    }



    // -----------------------------
    // Sort
    // -----------------------------


    if(artistYearSearch){


      releases.sort(
        (
          a,
          b
        )=>{

          return a.title
            .localeCompare(
              b.title
            );

        }
      );


    }



    return Response.json({

      releases,


      searchMode:
        artistYearSearch
          ? "artist-year"
          : "artist-album",


      artistOnly:
        false,

    });



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