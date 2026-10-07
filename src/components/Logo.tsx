import Image from "next/image";

// Logo Twichify (fichier : public/logo.png).
// Utilisable dans les composants serveur comme client.
export default function Logo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Logo Twichify"
      width={size}
      height={size}
      priority
      className={`rounded-xl shadow-lg shadow-purple-600/30 ${className}`}
    />
  );
}
