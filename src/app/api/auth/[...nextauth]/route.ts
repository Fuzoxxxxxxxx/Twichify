import NextAuth, { NextAuthOptions } from "next-auth";
import TwitchProvider from "next-auth/providers/twitch";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generateWidgetToken } from "@/lib/widget-token";
import { TWITCH_LOGIN_SCOPES } from "@/lib/twitch-user";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      authorization: {
        params: {
          // moderator:read:followers : lecture seule des followers de sa propre chaîne (page Dashboard → Twitch)
          scope: TWITCH_LOGIN_SCOPES,
        },
      },
    }),
  ],
  events: {
    // NextAuth v4 ne met pas à jour le compte lié lors des connexions suivantes : sans ça, un utilisateur
    // existant qui se reconnecte garderait l'ancien jeton (sans les nouveaux scopes) et un refresh_token périmé.
    async signIn({ account }) {
      if (account?.provider !== "twitch" || !account.providerAccountId) return;
      try {
        const fields = Object.fromEntries(
          Object.entries({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            scope: account.scope,
            token_type: account.token_type,
            id_token: account.id_token,
          }).filter(([, value]) => value !== undefined)
        );
        if (Object.keys(fields).length === 0) return;

        const client = await clientPromise;
        await client
          .db()
          .collection("accounts")
          .updateOne({ provider: "twitch", providerAccountId: account.providerAccountId }, { $set: fields });
      } catch (error) {
        console.error("Erreur lors de la mise à jour du jeton Twitch :", error);
      }
    },
    async createUser({ user }) {
      try {
        const client = await clientPromise;
        const db = client.db();
        const userObjectId = typeof user.id === "string" ? new ObjectId(user.id) : user.id;

        await db.collection("users").updateOne(
          { _id: userObjectId },
          {
            $set: {
              acceptedTermsAt: new Date(),
              // Nouveau compte : jeton de widgets dès la création, sans lien basé sur l'_id
              widgetToken: generateWidgetToken(),
              widgetLegacyIdDisabled: true,
            },
          }
        );
      } catch (error) {
        console.error("Erreur lors de l'enregistrement des CGU :", error);
      }
    },
  },
  pages: {
    // Se déclenche UNIQUEMENT en cas d'erreur de connexion
    error: "/auth/cancelled",
  },
  session: {
    strategy: "database",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };