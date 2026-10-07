"use client";

// Détecte les URLs (http/https) dans un texte et les transforme en liens cliquables sécurisés.
const URL_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g;

export default function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 underline break-all hover:text-purple-300 transition-colors"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
