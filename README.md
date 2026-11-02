# Age Server Community Web

A local React dashboard for the public, read-only Community API exposed by
AgeLANServer. It recreates the medieval-themed community pages using data from
the server you configure; it does not host a server or modify AgeLANServer.

## Requirements

- Node.js 22.12+ (required by the current Vite release)
- npm
- An AgeLANServer with its Community API enabled and reachable from this PC

## Configure and run

1. Copy `.env.example` to `.env`.
2. Set `AGE_SERVER_URL` to the server's web address, for example:

   ```dotenv
   AGE_SERVER_URL=https://127.0.0.1:443
   ```

3. If the server uses its own certificate, configure trust using either:
   - `AGE_SERVER_CA_FILE=./certs/ageserver-ca.pem` for the PEM certificate or
     CA file; this is recommended.
   - `AGE_SERVER_TLS_INSECURE=true` only on a trusted LAN when certificate
     validation cannot be configured. This disables TLS certificate
     verification for the development proxy.

4. Install dependencies and start the local web app:

   ```sh
   npm install
   npm run dev
   ```

   Open the localhost URL printed by Vite. The development server binds only to
   `127.0.0.1`. Vite proxies `/community/*` to `AGE_SERVER_URL`, avoiding
   browser CORS restrictions without changing the game server.

For a production build, run `npm run build`. `npm run preview` serves that
build locally and uses the same Community API proxy configuration. A static
host needs a same-origin reverse proxy for `/community/*`; browser requests
cannot use the local Vite proxy after deployment.

## Available pages

- **Overview:** joinable room count and details, server news, and the top
  profiles from the 1v1 Random Map Ranked leaderboard.
- **Lobbies:** advertisements returned by
  `/community/advertisement/findAdvertisements`, including player names,
  profiles, room settings, and participant IPs when present in the response.
- **Leaderboard:** configured leaderboard definitions and paginated rankings.
- **Players:** profile search by numeric ID or exact alias, plus a ranked
  profile listing.
- **Match history:** recent reported matches for a profile ID, with player
  results and before/after ratings.
- **News:** configured server news.
- **Resources:** available achievement definitions and awards, community
  events, clan search/details, inventory, and avatar statistics.

The client uses these public API routes:

| Route | Used for |
| --- | --- |
| `/community/leaderboard/GetPersonalStat` | Player search and profile/stat data |
| `/community/leaderboard/getRecentMatchHistory` | Profile match history |
| `/community/leaderboard/getAvailableLeaderboards` | Leaderboard selector |
| `/community/leaderboard/getLeaderboard2` | Ranked pages |
| `/community/advertisement/findAdvertisements` | Joinable room list and details |
| `/community/leaderboard/GetAvatarStatForProfile` | Avatar statistics |
| `/community/achievement/getAvailableAchievements` | Achievement definitions |
| `/community/achievement/getAchievements` | Profile award response |
| `/community/news/getNews` | Server news |
| `/community/CommunityEvent/getAvailableCommunityEvents` | Community event data |
| `/community/item/getInventoryByProfileIDs` | Profile inventory |
| `/community/clan/find` | Clan search |
| `/community/clan/getClanInfoFull` | Clan details |

## API limitations

The site intentionally does not invent data or expose controls that the public
API does not provide. There is no public endpoint for server status/uptime,
matchmaking queue, global match search, map catalog or pool, battle-server
registry/health, or server administration/configuration. Those old-web areas
are therefore not shown as working pages.

The server currently does not persist earned achievement awards or clan data.
Inventory and avatar stats may be empty for profiles not loaded by the current
server process. Match history is profile-based rather than a global match
listing.

Room advertisements can include player IP addresses. The UI displays an IP
only when the API returns one; server administrators should expose this
information only when intended for their community.

## Development

```sh
npm test
npm run lint
npm run build
```

The `.env` file is ignored by Git. Never commit private keys, certificates
containing private keys, or server credentials.

## License

This repository does not currently include an open-source license. All rights
are reserved by the copyright holder.
