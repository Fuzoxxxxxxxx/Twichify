# Twichify

Twichify est une plateforme pour les streamers Twitch. Elle relie un compte Twitch à Spotify et propose des widgets OBS, des outils de chat et des statistiques réunis dans un tableau de bord.

## Fonctionnalités

- **Widget musique Spotify** pour OBS : morceau en cours, pochette, progression et apparence personnalisable.
- **Widget de chat Twitch** : thèmes, animations, badges et emotes Twitch, BTTV, 7TV et FFZ. Les statistiques de chat sont facultatives et désactivées par défaut.
- **Commandes pour les bots** Nightbot, Wizebot, StreamElements et Streamlabs, avec messages personnalisables.
- **Tableau de bord Twitch** : statistiques de chaîne, followers, équipe, communauté et contenu, selon les permissions Twitch accordées.
- **Statistiques d'écoute Spotify** : historique, classements et habitudes d'écoute.
- **Outils communautaires** : idées et votes, centre d'aide, FAQ et tickets de support.
- **Administration** : gestion des utilisateurs, des tickets, de la FAQ, des idées, des incidents et des annonces du site.
- **Page d'état** des services et pages publiques d'informations, de confidentialité et de nouveautés.

## Technologies

- Next.js 16 (App Router), React 19 et TypeScript
- MongoDB et Mongoose
- NextAuth avec OAuth Twitch
- API Spotify et Twitch
- Tailwind CSS 4, Framer Motion et tmi.js

## Prérequis

- Node.js 20 ou ultérieur
- npm
- Une base MongoDB accessible depuis l'application
- Une application Twitch enregistrée dans la [console développeur Twitch](https://dev.twitch.tv/console)

## Démarrage local

Depuis le dossier `spotify-now-playing` :

```powershell
npm install
Copy-Item .env.example .env.local
```

Sur macOS ou Linux, utilisez `cp .env.example .env.local` à la place de `Copy-Item`.

Renseignez ensuite les variables ci-dessous dans `.env.local`. Ajoutez-y `NEXT_PUBLIC_BASE_URL` si elle n'est pas déjà présente dans le modèle. Les valeurs sont propres à votre environnement : ne partagez pas ce fichier et ne commitez aucun secret.

| Variable | Requise | Description |
| --- | :---: | --- |
| `DATABASE_URL` | Oui | URI de connexion MongoDB. |
| `NEXTAUTH_URL` | Oui | URL de l'application, par exemple `http://localhost:3000` en local. |
| `NEXTAUTH_SECRET` | Oui | Secret utilisé par NextAuth pour les sessions. |
| `TWITCH_CLIENT_ID` | Oui | Client ID de l'application Twitch. |
| `TWITCH_CLIENT_SECRET` | Oui | Client secret de l'application Twitch. |
| `ENCRYPTION_KEY` | Oui | Clé hexadécimale de 64 caractères (32 octets) pour chiffrer les identifiants Spotify enregistrés. |
| `NEXT_PUBLIC_BASE_URL` | Oui pour le retour OAuth Spotify | URL de base de l'application, par exemple `http://localhost:3000`, sans barre oblique finale. |
| `CRON_SECRET` | Facultative en local | Secret Bearer protégeant la route de vérification périodique de l'état. À configurer si un service externe l'appelle. |

Générez une valeur aléatoire avec Node.js pour `NEXTAUTH_SECRET` et `ENCRYPTION_KEY` :

```sh
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"
```

Vous pouvez générer une valeur distincte pour chaque variable. Conservez durablement la même `ENCRYPTION_KEY` : les identifiants déjà chiffrés ne pourront plus être déchiffrés avec une autre clé.

### Configurer OAuth Twitch

Dans la console développeur Twitch, créez une application et renseignez ses identifiants dans `.env.local`. Pour le développement local, ajoutez cette URL de redirection OAuth :

```text
http://localhost:3000/api/auth/callback/twitch
```

La connexion Twitch fournit l'identité du compte et les autorisations en lecture nécessaires aux fonctions du tableau de bord.

### Connecter Spotify

Les identifiants Spotify sont configurés par chaque utilisateur dans **Tableau de bord → Intégrations → Spotify**. Créez une application dans le [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), puis ajoutez à sa liste d'URI de redirection l'adresse exacte affichée par Twichify. En local, elle est généralement :

```text
http://localhost:3000/api/callback/spotify
```

Enregistrez le Client ID et le Client Secret dans Twichify, puis autorisez la connexion Spotify.

### Lancer l'application

```sh
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). Connectez-vous avec Twitch, puis configurez Spotify depuis le tableau de bord.

## Commandes npm

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le serveur Next.js de développement. |
| `npm run lint` | Vérifie le code avec ESLint. |
| `npm run build` | Compile l'application pour la production. |
| `npm run start` | Démarre le serveur de production après `npm run build`. |

## Principales pages

| URL | Contenu |
| --- | --- |
| `/` | Présentation de Twichify et aperçu des widgets. |
| `/dashboard` | Tableau de bord et liens de configuration des intégrations. |
| `/dashboard/spotify` | Connexion Spotify et paramètres OAuth. |
| `/dashboard/design` | Personnalisation du widget musique. |
| `/dashboard/chat` | Configuration du widget de chat. |
| `/dashboard/bot` | Configuration des commandes de bot. |
| `/dashboard/stats` | Historique et statistiques d'écoute. |
| `/dashboard/twitch` | Statistiques et données de la chaîne Twitch. |
| `/widget/[userId]` | Widget musique à utiliser comme source navigateur OBS. |
| `/widget/chat/[userId]` | Widget de chat à utiliser comme source navigateur OBS. |
| `/help`, `/ideas`, `/support` | Aide, idées et assistance. |
| `/status`, `/changelog` | État des services et historique des nouveautés. |

Les URL des widgets et des commandes se récupèrent dans le tableau de bord. Elles contiennent un jeton d'accès : traitez-les comme des liens privés et régénérez-les depuis le tableau de bord si elles sont exposées.

## Déploiement

L'application peut être déployée sur une plateforme compatible avec Next.js et MongoDB. Configurez les variables d'environnement de production, notamment les URL publiques et les URI de redirection Twitch et Spotify, puis exécutez :

```sh
npm run build
npm run start
```

La route `GET /api/cron/check-status` permet à un service de planification externe de lancer les vérifications de disponibilité. Configurez `CRON_SECRET` et envoyez-le dans l'en-tête `Authorization: Bearer <CRON_SECRET>`. Ne rendez pas cette route accessible sans son secret.
