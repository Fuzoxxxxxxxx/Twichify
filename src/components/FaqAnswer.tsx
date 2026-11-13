// Affichage d'une réponse de FAQ : une ligne = un paragraphe, `**texte**` en gras, et une ligne qui commence par
// « Note » est mise en valeur dans un encadré. Partagé par la page d'aide publique et l'aperçu de l'admin FAQ,
// pour que ce qu'on prévisualise soit exactement ce que les utilisateurs verront.
export default function FaqAnswer({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, lineIndex) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);

        const formattedLine = parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} className="font-semibold text-zinc-100">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        const isNote = line.trim().toLowerCase().startsWith("note");

        return (
          <p
            key={lineIndex}
            className={`leading-relaxed ${
              isNote
                ? "mt-3 rounded-lg border border-purple-500/25 bg-purple-500/10 p-3 text-sm text-purple-100"
                : "mb-2 last:mb-0"
            }`}
          >
            {formattedLine}
          </p>
        );
      })}
    </>
  );
}
