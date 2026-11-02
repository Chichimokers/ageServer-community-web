# Age Server Community Web

A local React dashboard for the public, read-only Community API exposed by
AgeLANServer. It recreates the medieval-themed community pages using data from
the server you configure; it does not host a server or modify AgeLANServer.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for
the development and pull request guidelines. Use the repository's Issues tab
to report a bug or propose a change.

## Requirements

- Node.js 22.12+ (required by the current Vite release)
- npm
- An AgeLANServer with its Community API enabled and reachable from this PC

## Configure and run

1. Copy `.env.example` to `.env`.
2. Set `VITE_AGE_SERVER_URL` to the server's web address, for example:

   ```dotenv
   VITE_AGE_SERVER_URL=https://127.0.0.1:443
   ```

3. If the server uses a self-signed certificate, install and trust its
   certificate (or its root CA) in Windows and restart the browser. The
   certificate must be valid for the host/IP in `VITE_AGE_SERVER_URL`.
   Browsers do not let website JavaScript disable TLS certificate validation;
   this app never ignores certificate errors.

4. Install dependencies and start the local web app:

   ```sh
   npm install
   npm run dev
   ```

   Open the localhost URL printed by Vite. The development server binds only to
   `127.0.0.1`. The browser sends each `/community/*` request directly to
   `VITE_AGE_SERVER_URL`; Vite does not proxy or relay API traffic.

   Because this is a cross-origin browser request, AgeLANServer must return
   suitable CORS headers allowing the Vite origin (for example
   `http://127.0.0.1:5173`). If the browser reports a CORS error, the server
   must be configured to allow that origin; a browser-side app cannot work
   around CORS while sending requests directly.

For a production build, run `npm run build`. `npm run preview` serves that
build locally. The `VITE_AGE_SERVER_URL` value is embedded into the frontend at
build time. Any site origin used in production must also be allowed by the
server's CORS policy.

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
  results and before/after ratings, plus map thumbnails and civilization icons.
- **Lobby details:** map artwork and civilization icons alongside the public
  player and room details.
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
containing private keys, or server credentials. Only the server URL is needed
in the frontend environment; it is public to anyone who can load the website.

## License

This project is licensed under the GNU General Public License v3.0. See
[LICENSE](./LICENSE) for the full license text.
