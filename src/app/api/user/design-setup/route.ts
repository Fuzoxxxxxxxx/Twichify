import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // On récupère TOUTES les clés envoyées par le Dashboard (ajout de enableBlurBg)
    const { 
      layout, 
      fontFamily, 
      showCover, 
      showProgress, 
      showTimestamp, 
      showArtist, 
      isRotating, 
      enableGlow,
      enableBlurBg, // <--- Nouveau paramètre
      accentColor, 
      borderRadius, 
      bgOpacity,
      blurAmount
    } = await req.json();

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    // On met à jour l'objet widgetSettings
    // Utiliser $set sur l'objet parent ou champ par champ assure la persistance
    await User.findOneAndUpdate(
      { email: session.user?.email },
      { 
        $set: { 
          "widgetSettings.layout": layout,
          "widgetSettings.fontFamily": fontFamily,
          "widgetSettings.showCover": showCover,
          "widgetSettings.showProgress": showProgress,
          "widgetSettings.showTimestamp": showTimestamp,
          "widgetSettings.showArtist": showArtist,
          "widgetSettings.isRotating": isRotating,
          "widgetSettings.enableGlow": enableGlow,
          "widgetSettings.enableBlurBg": enableBlurBg, 
          "widgetSettings.accentColor": accentColor,
          "widgetSettings.borderRadius": borderRadius,
          "widgetSettings.bgOpacity": bgOpacity,
          "widgetSettings.blurAmount": blurAmount,
        } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur API Design:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}