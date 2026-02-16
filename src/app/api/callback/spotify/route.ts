import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions as nextAuthOptions } from "../../auth/[...nextauth]/route"; // Import crucial
import mongoose from "mongoose";
import User from "@/models/User";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  
  // ON PASSE LES OPTIONS ICI AUSSI
  const session = await getServerSession(nextAuthOptions);

  if (!session || !session.user?.email || !code) {
    return NextResponse.redirect(new URL("/dashboard?error=auth_failed", req.url));
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const user = await User.findOne({ email: session.user.email });

  try {
    const spotifyAuthOptions = {
      url: "https://accounts.spotify.com/api/token", // Correction de l'URL Spotify
      method: "post",
      data: new URLSearchParams({ // Utilisation de data au lieu de params pour POST
        code: code,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback/spotify`,
        grant_type: "authorization_code",
      }),
      headers: {
        Authorization: "Basic " + Buffer.from(user.spotifyClientId + ":" + user.spotifyClientSecret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    const response = await axios(spotifyAuthOptions);
    const { refresh_token } = response.data;

    // Sauvegarde du refresh_token final
    await User.findOneAndUpdate(
      { email: session.user.email },
      { spotifyRefreshToken: refresh_token }
    );

    // Redirection vers le dashboard avec le flag de succès
    return NextResponse.redirect(new URL("/dashboard?success=spotify_connected", req.url));
    
  } catch (error: any) {
    console.error("Spotify Token Error:", error.response?.data || error.message);
    return NextResponse.redirect(new URL("/dashboard?error=token_exchange_failed", req.url));
  }
}