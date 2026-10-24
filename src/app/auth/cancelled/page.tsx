"use client";

import { ShieldAlert, Lock, Eye, CheckCircle2 } from "lucide-react";
import AuthNotice from "@/components/site/AuthNotice";

// Affichée quand la connexion Twitch est refusée ou la fenêtre fermée (voir auth/signin pour l'aiguillage des erreurs).
export default function AuthCancelled() {
  return (
    <AuthNotice
      tone="purple"
      icon={ShieldAlert}
      title="Autorisation annulée"
      helpLabel="Pourquoi cette autorisation ?"
      modalTitle="Transparence et sécurité"
      modalSubtitle="À quoi servent les permissions Twitch ?"
      modalItems={[
        {
          icon: CheckCircle2,
          title: "Identification unique",
          text: "Pour lier tes overlays à ton propre compte sans avoir à créer un mot de passe de plus.",
        },
        {
          icon: Eye,
          title: "Données de stream",
          text: "Afficher ton nom, ton avatar et tes informations de stream en direct sur tes widgets OBS.",
        },
        {
          icon: Lock,
          title: "Aucun contrôle sur ton chat",
          text: "Nous ne demandons aucun accès pour modérer ou envoyer des messages à ta place.",
        },
      ]}
    >
      <p>
        Tu as refusé l'accès ou fermé la fenêtre Twitch. Twichify a besoin de cette autorisation pour générer tes
        overlays en direct.
      </p>
    </AuthNotice>
  );
}
