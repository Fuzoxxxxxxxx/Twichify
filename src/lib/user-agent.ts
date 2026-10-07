// Analyse minimale d'un User-Agent, suffisante pour afficher « Chrome sur Windows » etc.
// dans la liste des sessions actives. Pas exhaustif (pas de version, pas de bots) : le but
// est d'aider la personne à reconnaître ses propres appareils, pas une empreinte précise.

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/crios\//i.test(ua)) return "Chrome"; // Chrome sur iOS
  if (/fxios\//i.test(ua)) return "Firefox"; // Firefox sur iOS
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome|chromium|crios/i.test(ua)) return "Safari";
  return "Navigateur";
}

function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/mac os x|macintosh/i.test(ua)) return "Mac";
  if (/android/i.test(ua)) return "Android";
  if (/linux/i.test(ua)) return "Linux";
  return "";
}

/** "Chrome sur Windows", "Safari sur iPhone", ou "Appareil inconnu" si l'UA est absent/vide. */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Appareil inconnu";
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  return os ? `${browser} sur ${os}` : browser;
}
