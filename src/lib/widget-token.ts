import crypto from "crypto";
import mongoose from "mongoose";
import User from "@/models/User";

/**
 * Jeton de lien des widgets.
 *
 * Les URL des widgets (source navigateur OBS) et des commandes bot contiennent un jeton aléatoire
 * plutôt que l'_id du compte : si le lien fuite (capture d'écran de stream, partage par erreur),
 * l'utilisateur le régénère et l'ancien cesse de fonctionner immédiatement.
 *
 * - Jeton : 16 octets aléatoires en hexadécimal (32 caractères, 128 bits).
 * - Ancien format : l'_id Mongo (24 caractères hexadécimaux). Il reste accepté tant que l'utilisateur
 *   n'a pas régénéré son lien, pour ne pas casser les sources OBS et commandes bot déjà en place.
 *   Régénérer le lien coupe définitivement l'ancien format (widgetLegacyIdDisabled).
 */

const TOKEN_PATTERN = /^[a-f0-9]{32}$/;
const LEGACY_ID_PATTERN = /^[a-f0-9]{24}$/i;

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

export function generateWidgetToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Retrouve l'utilisateur correspondant à la valeur présente dans une URL de widget ou de commande bot
 * (jeton, ou ancien _id tant qu'il n'a pas été désactivé). Renvoie null si la valeur est inconnue,
 * mal formée ou révoquée : jamais d'exception sur une valeur invalide.
 */
export async function findUserByWidgetRef(ref: string | null | undefined) {
  if (!ref) return null;
  await ensureDb();

  if (TOKEN_PATTERN.test(ref)) {
    return User.findOne({ widgetToken: ref });
  }

  if (LEGACY_ID_PATTERN.test(ref)) {
    const user = await User.findById(ref);
    return user && !user.widgetLegacyIdDisabled ? user : null;
  }

  return null;
}

/**
 * Renvoie le jeton de l'utilisateur, en le créant à la première demande (comptes existants).
 * La création est atomique : deux requêtes simultanées ne produisent qu'un seul jeton.
 */
export async function ensureWidgetToken(userId: string): Promise<string | null> {
  await ensureDb();

  const created = await User.findOneAndUpdate(
    { _id: userId, widgetToken: null },
    { $set: { widgetToken: generateWidgetToken() } },
    { new: true }
  );
  if (created?.widgetToken) return created.widgetToken as string;

  const existing = await User.findById(userId).select("widgetToken");
  return (existing?.widgetToken as string | undefined) ?? null;
}

/**
 * Génère un nouveau jeton. L'ancien jeton ET l'ancien lien basé sur l'_id cessent de fonctionner
 * immédiatement.
 */
export async function rotateWidgetToken(userId: string): Promise<string> {
  await ensureDb();

  const token = generateWidgetToken();
  await User.updateOne({ _id: userId }, { $set: { widgetToken: token, widgetLegacyIdDisabled: true } });
  return token;
}
