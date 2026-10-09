import { trackedFetch } from "@/lib/passive-health";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAppAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  // trackedFetch = fetch + mesure passive de la santé de Twitch (voir lib/passive-health).
  const res = await trackedFetch("Twitch API", "https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) throw new Error("Impossible d'obtenir le token Twitch");

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export async function getBroadcasterId(login: string) {
  const token = await getAppAccessToken();
  const res = await trackedFetch("Twitch API", `https://api.twitch.tv/helix/users?login=${login}`, {
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  return data.data?.[0]?.id ?? null;
}
