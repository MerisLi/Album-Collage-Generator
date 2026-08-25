export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title")?.trim() ?? "";
  const artist = searchParams.get("artist")?.trim() ?? "";


  if (!title && !artist) {
    return Response.json(
      {
        error: "Please enter an album name or artist.",
      },
      {
        status: 400,
      }
    );
  }


  let query = "";


  // Artist search
  if (artist && !title) {
    query =
      `artist:"${artist}"`;
  }


  // Album + Artist
  if (artist && title) {
    query =
      `release:"${title}" AND artist:"${artist}"`;
  }


  // Album only
  if (!artist && title) {
    query =
      `release:"${title}"`;
  }



  const url =
    `https://musicbrainz.org/ws/2/release/` +
    `?query=${encodeURIComponent(query)}` +
    `&fmt=json` +
    `&limit=50`;



  async function getCover(
    releaseId:string
  ) {

    try {

      const response =
        await fetch(
          `https://coverartarchive.org/release/${releaseId}`,
          {
            headers:{
              Accept:"application/json",
            },
            cache:"no-store",
          }
        );


      if(!response.ok){
        return null;
      }


      const data =
        await response.json();


      return (
        data.images?.[0]
        ?.thumbnails?.large ??
        data.images?.[0]
        ?.image ??
        null
      );


    } catch {

      return null;

    }

  }



  try {


    const response =
      await fetch(
        url,
        {
          headers:{
            "User-Agent":
              "AlbumWall/0.1.0 (album-wall)",
            Accept:
              "application/json",
          },

          cache:"no-store",
        }
      );



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



    const releases = [];



    for(
      const release of results
    ){


      // --------------------------
      // Remove unwanted releases
      // --------------------------

      const type =
        release["release-group"]
        ?.["primary-type"];


      if(
        type &&
        type !== "Album" &&
        type !== "EP"
      ){
        continue;
      }



      const cover =
        await getCover(
          release.id
        );



      // no cover = skip
      // because Album Wall needs images

      if(!cover){
        continue;
      }



      releases.push({

        id:
          release.id,


        title:
          release.title,


        artist:
          release["artist-credit"]
          ?.map(
            (a:any)=>
              a.name
          )
          .join(", ") ??
          artist,



        date:
          release.date ??
          null,



        country:
          release.country ??
          null,



        status:
          release.status ??
          null,



        disambiguation:
          release.disambiguation ??
          null,



        cover,

      });



      // avoid too many results
      if(releases.length >= 50){
        break;
      }

    }



    return Response.json({

      releases,


      artistOnly:
        Boolean(
          artist &&
          !title
        ),

    });



  } catch(error){


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
        status:500,
      }
    );

  }

}