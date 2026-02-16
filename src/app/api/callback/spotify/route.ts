import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import User from "@/models/User";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const session = await getServerSession();

  if (!session || !session.user?.email || !code) {
    return NextResponse.redirect(new URL("/dashboard?error=auth_failed", req.url));
  }

  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.DATABASE_URL!);

  const user = await User.findOne({ email: session.user.email });

  try {
    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      method: "post",
      params: {
        code: code,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/callback/spotify`,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization: "Basic " + Buffer.from(user.spotifyClientId + ":" + user.spotifyClientSecret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    const response = await axios(authOptions);
    const { refresh_token } = response.data;

    // Sauvegarde du refresh_token final
    await User.findOneAndUpdate(
      { email: session.user.email },
      { spotifyRefreshToken: refresh_token }
    );

    return NextResponse.redirect(new URL("/dashboard?success=spotify_connected", req.url));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/dashboard?error=token_exchange_failed", req.url));
  }
}