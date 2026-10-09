import { Schema, model, models } from "mongoose";

/**
 * Suivi des départs de followers (opt-in).
 *
 * L'API Twitch n'expose aucun historique de désabonnements. Pour les détecter, Twichify garde un instantané
 * de la liste des followers de l'utilisateur et le compare à chaque analyse : ceux qui ont disparu entre deux
 * analyses sont des départs.
 *
 * Pour limiter le stockage (jusqu'à 5 000 followers par utilisateur), l'instantané ne contient QUE les identifiants
 * Twitch, sous forme de nombres (≈ 11 octets par follower, contre ≈ 100 avec pseudo, nom et date de suivi).
 * Les pseudos et avatars des départs sont relus sur Twitch à l'affichage, jamais stockés.
 *
 * Compatibilité : les documents créés avant ce format contiennent des objets { i, l, n, f } (identifiant, login,
 * nom affiché, date de suivi). Le champ est donc de type Mixed ; ils sont réécrits en identifiants seuls à la
 * prochaine analyse, qui s'appuie une dernière fois sur leurs pseudos pour ne perdre aucun nom de départ.
 */
const DepartureSchema = new Schema(
  {
    id: String, // identifiant Twitch
    detectedAt: Date, // date de l'analyse qui a constaté le départ
    accountGone: { type: Boolean, default: false }, // compte supprimé ou banni côté Twitch
    // Départs enregistrés avant le passage aux identifiants seuls : conservés tels quels (utiles si le compte a disparu).
    login: String,
    name: String,
    followedAt: String,
  },
  { _id: false }
);

const FollowerTrackingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // Identifiants Twitch des followers (nombres). Mixed : accepte aussi l'ancien format { i, l, n, f } sans erreur de lecture.
    followers: { type: [Schema.Types.Mixed], default: [] },
    // Les 200 départs les plus récents (les plus anciens sont écartés).
    departures: { type: [DepartureSchema], default: [] },
    baselineAt: { type: Date, default: Date.now }, // première analyse : point de départ du suivi
    scannedAt: { type: Date, default: Date.now }, // dernière analyse complète
  },
  { timestamps: true }
);

const FollowerTracking = models.FollowerTracking || model("FollowerTracking", FollowerTrackingSchema);
export default FollowerTracking;
