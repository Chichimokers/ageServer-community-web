export interface PendingFeature {
  key: string
  requiredApi: string
}

export const pendingFeatures: PendingFeature[] = [
  { key: "Server overview, uptime and LAN addresses", requiredApi: "A public server information endpoint" },
  { key: "Live matchmaking queue and active automatch games", requiredApi: "A public matchmaking snapshot endpoint" },
  { key: "Server map catalog and configured map pool", requiredApi: "A public maps/map-pool endpoint" },
  { key: "Battle-server registry and health", requiredApi: "A public battle-server endpoint" },
  { key: "Administration, configuration and moderation", requiredApi: "Authenticated administrative endpoints" },
  { key: "Global match list and complete match details", requiredApi: "A public match-history search endpoint" },
]
