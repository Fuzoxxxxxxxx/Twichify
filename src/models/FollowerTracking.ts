import { Schema, model, models } from "mongoose";

/**
 * Suivi des départs de followers (opt-in).
 *
 * L'API Twitch n'expose aucun historique de désabonnements. Pour les détecter, Twichify garde un instantané
 * de la liste des followers de l'utilisateur (identifiants et pseudos publics) et le compare à chaque analyse :
 * ceux qui ont disparu entre deux analyses sont des départs.
 *
 * Les clés sont volontairement courtes pour limiter la taille du document (jusqu'à 5 000 followers) :
 *   i = identifiant Twitch, l = login, n = nom affiché, f = date de suivi (ISO).
 */
const FollowerSchema = new Schema({ i: String, l: String, n: String, f: String }, { _id: false });

const DepartureSchema = new Schema(
  {
    id: String,
    login: String,
    name: String,
    followedAt: String, // date à laquelle la personne avait suivi la chaîne
    detectedAt: Date, // date de l'analyse qui a constaté le départ
    accountGone: { type: Boolean, default: false }, // compte supprimé ou banni côté Twitch
  },
  { _id: false }
);

const FollowerTrackingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    followers: { type: [FollowerSchema], default: [] },
    // Les 200 départs les plus récents (les plus anciens sont écartés).
    departures: { type: [DepartureSchema], default: [] },
    baselineAt: { type: Date, default: Date.now }, // première analyse : point de départ du suivi
    scannedAt: { type: Date, default: Date.now }, // dernière analyse complète
  },
  { timestamps: true }
);

const FollowerTracking = models.FollowerTracking || model("FollowerTracking", FollowerTrackingSchema);
export default FollowerTracking;
