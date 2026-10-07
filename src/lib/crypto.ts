import crypto from "crypto";

/**
 * Chiffrement AES-256-GCM pour les données sensibles stockées en base
 * (clés API Spotify, refresh token). Nécessite la variable d'environnement
 * ENCRYPTION_KEY : une chaîne hexadécimale de 64 caractères (32 octets).
 *
 * Génère-en une avec :
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * puis ajoute-la à .env.local sous le nom ENCRYPTION_KEY.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommandé pour GCM

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY manquante ou invalide : elle doit faire 64 caractères hexadécimaux (32 octets). " +
        "Génère-en une avec: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Chiffre une chaîne. Retourne le format "iv:authTag:ciphertext" (tout en hex),
 * ou null si l'entrée est null/undefined/vide (on ne chiffre pas l'absence de valeur).
 */
export function encrypt(plainText: string | null | undefined): string | null {
  if (!plainText) return null;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Déchiffre une chaîne au format "iv:authTag:ciphertext".
 * Retourne null si l'entrée est vide, ou si elle ne correspond pas au format chiffré
 * (utile pour une transition en douceur avec d'anciennes valeurs en clair non migrées).
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    // Valeur qui n'est pas au format chiffré (ex: donnée ancienne en clair) : on la retourne telle quelle
    // pour éviter de casser un compte existant tant qu'il n'a pas été re-sauvegardé.
    return encryptedText;
  }

  try {
    const [ivHex, authTagHex, dataHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(dataHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Erreur déchiffrement:", error);
    return null;
  }
}
