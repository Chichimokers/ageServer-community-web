export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface Profile {
  id: number
  platformPath: string
  alias: string
  statGroupId: number
  xp: number
  level: number
  platformUserId: string
  accountType: number
}

export interface LeaderboardEntry {
  rank: number
  profile: Profile
  leaderboardId: number
  rating: number
  highestRating: number
  wins: number
  losses: number
  streak: number
  lastMatch: number
}

export interface MatchPlayer {
  profileId: number
  raceId: number
  teamId: number
  wins: number
  losses: number
  streak: number
  result: number
  oldRating: number
  newRating: number
}

export interface MatchRecord {
  id: number
  mapName: string
  matchTypeId: number
  description: string
  startedAt: number
  finishedAt: number
  players: MatchPlayer[]
}

export interface LobbyPeer {
  profileId: number
  raceId: number
  teamId: number
  ip: string
}

export interface Lobby {
  id: number
  hostProfileId: number
  state: number
  description: string
  mapName: string
  maxPlayers: number
  matchTypeId: number
  observers: number
  observersEnabled: boolean
  observerDelay: number
  isLan: boolean
  startedAt: number | null
  relayRegion: string
  peers: LobbyPeer[]
}

export interface NewsItem {
  id: number | string
  title: string
  subtitle: string
  markup: string
  summary: string
  body: string
  visibleAt: number
  expiresAt: number
}

export interface AvatarStat {
  statId: number
  profileId: number
  value: number | string
  metadata: unknown
  updatedAt: number
}

export interface InventoryItem {
  id: number
  version: number
  definitionId: number
  profileId: number
  durability: number
  metadata: string
  createdAt: number
  locationId: number
  tradeId: number
  permission: number
  maxCharges: number
}

export interface InventoryLocation {
  id: number
  version: number
  locationId: number
  categoryId: number
  maxItems: number
  locked: number
  isPublic: number
  isForMatch: number
  tracksMoves: number
}

const API_ROOT = "/community"

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value)
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

function requireSuccess(payload: unknown): unknown[] {
  const envelope = asArray(payload)
  if (envelope.length === 0 || asNumber(envelope[0], -1) !== 0) {
    throw new Error(`The Community API returned an unsuccessful response: ${JSON.stringify(payload)}`)
  }
  return envelope
}

async function get(path: string, params: Record<string, string | number | number[] | string[]> = {}): Promise<unknown> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    query.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value))
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : ""
  const response = await fetch(`${API_ROOT}${path}${suffix}`, {
    headers: { Accept: "application/json" },
  })
  const text = await response.text()
  if (!response.ok) {
    let message = text
    try {
      const body: unknown = JSON.parse(text)
      if (typeof body === "object" && body !== null && "error" in body) {
        message = asString(body.error, text)
      }
    } catch {
      message = text
    }
    throw new Error(`Community API ${path} failed (${response.status}): ${message || response.statusText}`)
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error(`Community API ${path} returned invalid JSON`)
  }
}

function decodeProfile(row: unknown): Profile {
  const value = asArray(row)
  return {
    id: asNumber(value[1]),
    platformPath: asString(value[2]),
    alias: asString(value[5] ?? value[4], "Unknown player"),
    statGroupId: asNumber(value[7]),
    xp: asNumber(value[8]),
    level: asNumber(value[9]),
    platformUserId: asString(value[12]),
    accountType: asNumber(value[13]),
  }
}

function decodeLeaderboardStat(row: unknown, profile: Profile, index: number): LeaderboardEntry {
  const value = asArray(row)
  const rank = asNumber(value[7], -1)
  return {
    rank: rank > 0 ? rank : index + 1,
    profile,
    leaderboardId: asNumber(value[1]),
    wins: asNumber(value[2]),
    losses: asNumber(value[3]),
    streak: asNumber(value[4]),
    rating: asNumber(value[12]),
    lastMatch: asNumber(value[13]),
    highestRating: asNumber(value[16], asNumber(value[12])),
  }
}

function decodeLeaderboardEnvelope(payload: unknown): LeaderboardEntry[] {
  const envelope = requireSuccess(payload)
  const profiles = asArray(envelope[2]).map(decodeProfile)
  const stats = asArray(envelope[3])
  return profiles.map((profile, index) => decodeLeaderboardStat(stats[index], profile, index))
}

export async function getPersonalStats(input: {
  profileIds?: number[]
  aliases?: string[]
  profileNames?: string[]
}): Promise<LeaderboardEntry[]> {
  const payload = await get("/leaderboard/GetPersonalStat", {
    profile_ids: input.profileIds ?? [],
    aliases: input.aliases ?? [],
    profile_names: input.profileNames ?? [],
  })
  return decodeLeaderboardEnvelope(payload)
}

export async function getAvailableLeaderboards(): Promise<unknown> {
  return get("/leaderboard/getAvailableLeaderboards")
}

export async function getLeaderboard(leaderboardId: number, start = 1, count = 100): Promise<LeaderboardEntry[]> {
  const payload = await get("/leaderboard/getLeaderboard2", {
    leaderboard_id: leaderboardId,
    start,
    count: Math.min(Math.max(count, 1), 1000),
  })
  return decodeLeaderboardEnvelope(payload)
}

export async function getRecentMatchHistory(profileIds: number[]): Promise<MatchRecord[]> {
  const payload = requireSuccess(await get("/leaderboard/getRecentMatchHistory", { profile_ids: profileIds }))
  return asArray(payload[1]).map((row) => {
    const value = asArray(row)
    const players = asArray(value[15]).map((member) => {
      const fields = asArray(member)
      return {
        profileId: asNumber(fields[1]),
        raceId: asNumber(fields[2], -1),
        teamId: asNumber(fields[4]),
        wins: asNumber(fields[5]),
        losses: asNumber(fields[6]),
        streak: asNumber(fields[7]),
        result: asNumber(fields[9]),
        oldRating: asNumber(fields[10]),
        newRating: asNumber(fields[11]),
      }
    })
    return {
      id: asNumber(value[0]),
      mapName: asString(value[2], "Unknown map"),
      matchTypeId: asNumber(value[4]),
      description: asString(value[7]),
      startedAt: asNumber(value[8]),
      finishedAt: asNumber(value[9]),
      players,
    }
  })
}

export async function findAdvertisements(gameId = "age2"): Promise<{ lobbies: Lobby[]; profiles: Profile[] }> {
  const envelope = requireSuccess(await get("/advertisement/findAdvertisements"))
  const modernLayout = ["age2", "age4", "aom"].includes(gameId.toLowerCase())
  const visibleIndex = modernLayout ? 10 : 6
  const profiles = asArray(envelope[2]).map(decodeProfile)
  const lobbies = asArray(envelope[1]).map((raw) => {
    const row = asArray(raw)
    const peers = asArray(row[visibleIndex + 7]).map((peer) => {
      const fields = asArray(peer)
      return {
        profileId: asNumber(fields[1]),
        raceId: asNumber(fields[4], -1),
        teamId: asNumber(fields[5]),
        ip: asString(fields[6]),
      }
    })
    return {
      id: asNumber(row[0]),
      hostProfileId: asNumber(row[modernLayout ? 6 : 3]),
      state: asNumber(row[modernLayout ? 7 : 4]),
      description: asString(row[modernLayout ? 8 : 5]),
      mapName: asString(row[visibleIndex + 1], "Unknown map"),
      maxPlayers: asNumber(row[visibleIndex + 4]),
      matchTypeId: asNumber(row[visibleIndex + 6]),
      observers: asNumber(row[visibleIndex + 8]),
      observersEnabled: asBoolean(row[visibleIndex + 10]),
      observerDelay: asNumber(row[visibleIndex + 11]),
      isLan: asBoolean(row[visibleIndex + 13]),
      startedAt: row[visibleIndex + 14] == null ? null : asNumber(row[visibleIndex + 14]),
      relayRegion: asString(row[visibleIndex + 15]),
      peers,
    }
  })
  return { lobbies, profiles }
}

export async function getNews(): Promise<NewsItem[]> {
  const envelope = requireSuccess(await get("/news/getNews"))
  return asArray(envelope[1]).map((raw) => {
    const row = asArray(raw)
    return {
      id: typeof row[0] === "number" || typeof row[0] === "string" ? row[0] : "",
      title: asString(row[1]),
      subtitle: asString(row[2]),
      markup: asString(row[4]),
      summary: asString(row[5]),
      body: asString(row[6]),
      visibleAt: asNumber(row[8]),
      expiresAt: asNumber(row[9]),
    }
  })
}

export async function getAvailableAchievements(): Promise<unknown> {
  return get("/achievement/getAvailableAchievements")
}

export async function getAchievements(profileIds: number[]): Promise<unknown> {
  return get("/achievement/getAchievements", { profileids: profileIds })
}

export async function getAvailableCommunityEvents(): Promise<unknown> {
  return get("/CommunityEvent/getAvailableCommunityEvents")
}

export async function getAvatarStats(profileName: string): Promise<AvatarStat[]> {
  const payload = requireSuccess(await get("/leaderboard/GetAvatarStatForProfile", {
    profile_names: [profileName],
  }))
  return asArray(payload[1]).map((raw) => {
    const row = asArray(raw)
    return {
      statId: asNumber(row[0]),
      profileId: asNumber(row[1]),
      value: typeof row[2] === "number" || typeof row[2] === "string" ? row[2] : "",
      metadata: row[3],
      updatedAt: asNumber(row[4]),
    }
  })
}

export async function getInventory(profileIds: number[]): Promise<{
  itemsByProfile: Map<string, InventoryItem[]>
  locations: InventoryLocation[]
}> {
  const payload = requireSuccess(await get("/item/getInventoryByProfileIDs", { profileids: profileIds }))
  const itemsByProfile = new Map<string, InventoryItem[]>()
  for (const entry of asArray(payload[1])) {
    const [profileId, rawItems] = asArray(entry)
    const items = asArray(rawItems).map((raw) => {
      const row = asArray(raw)
      return {
        id: asNumber(row[0]),
        version: asNumber(row[1]),
        definitionId: asNumber(row[2]),
        profileId: asNumber(row[3]),
        durability: asNumber(row[4]),
        metadata: asString(row[6]),
        createdAt: asNumber(row[7]),
        locationId: asNumber(row[8]),
        tradeId: asNumber(row[9]),
        permission: asNumber(row[10]),
        maxCharges: asNumber(row[11]),
      }
    })
    itemsByProfile.set(asString(profileId), items)
  }
  const locations = asArray(payload[2]).flatMap((entry) => asArray(asArray(entry)[1])).map((raw) => {
    const row = asArray(raw)
    return {
      id: asNumber(row[0]),
      version: asNumber(row[1]),
      locationId: asNumber(row[2]),
      categoryId: asNumber(row[3]),
      maxItems: asNumber(row[4]),
      locked: asNumber(row[5]),
      isPublic: asNumber(row[6]),
      isForMatch: asNumber(row[7]),
      tracksMoves: asNumber(row[8]),
    }
  })
  return { itemsByProfile, locations }
}

export async function findClans(input: {
  name?: string
  tags?: string[]
  start?: number
  count?: number
} = {}): Promise<unknown> {
  return get("/clan/find", {
    joinPolicies: [],
    name: input.name ?? "",
    tags: input.tags ?? [],
    start: input.start ?? 1,
    count: input.count ?? 100,
  })
}

export async function getClanInfo(name: string): Promise<unknown> {
  return get("/clan/getClanInfoFull", { name })
}

export function parseLeaderboardDefinitions(value: unknown): Array<{ id: number; name: string }> {
  const root = asArray(value)
  const rows = root[0] === 0 && Array.isArray(root[2]) ? asArray(root[2]) : root
  const found: Array<{ id: number; name: string }> = []
  for (const row of rows) {
    if (Array.isArray(row) && row.length >= 2 && Number.isFinite(Number(row[0])) && typeof row[1] === "string") {
      found.push({ id: Number(row[0]), name: row[1] })
      continue
    }
    if (typeof row !== "object" || row === null) continue
    const record = row as Record<string, unknown>
    const id = asNumber(record.leaderboard_id ?? record.leaderboardId ?? record.id, -1)
    const name = asString(record.name ?? record.displayName ?? record.title)
    if (id > 0 && name) found.push({ id, name })
  }
  return [...new Map(found.map((item) => [item.id, item])).values()]
}

export function leaderboardName(raw: string): string {
  const names: Record<string, string> = {
    SOLO_DM_RANKED: "1v1 Deathmatch Ranked",
    TEAM_DM_RANKED: "Team Deathmatch Ranked",
    SOLO_RM_RANKED: "1v1 Random Map Ranked",
    TEAM_RM_RANKED: "Team Random Map Ranked",
    SOLO_BR_RANKED: "Battle Royale Ranked",
    SOLO_EW_RANKED: "1v1 Empire Wars Ranked",
    TEAM_EW_RANKED: "Team Empire Wars Ranked",
  }
  return names[raw] ?? raw.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function parseRawRows(value: unknown): unknown[] {
  if (Array.isArray(value) && typeof value[0] === "number" && value[0] === 0) {
    return asArray(value[1])
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>
    for (const key of ["items", "achievements", "events", "results", "data"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[]
    }
  }
  return asArray(value)
}

export function profileFromId(profileId: number): Profile {
  return {
    id: profileId,
    platformPath: "",
    alias: `Player ${profileId}`,
    statGroupId: profileId,
    xp: 0,
    level: 0,
    platformUserId: "",
    accountType: 0,
  }
}

export function displayMapName(raw: string): string {
  const name = raw.replace(/\.(rms2?|RMS2?)$/, "").replace(/([a-z])([A-Z])/g, "$1 $2")
  return name.replace(/[_-]+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function civilizationName(raceId: number): string {
  const names = [
    "Aztecs", "Berbers", "Britons", "Bulgarians", "Burmese", "Byzantines", "Celts", "Chinese",
    "Cumans", "Ethiopians", "Franks", "Goths", "Huns", "Incas", "Hindustanis", "Italians",
    "Japanese", "Khmer", "Koreans", "Lithuanians", "Magyars", "Malay", "Malians", "Mayans",
    "Mongols", "Persians", "Portuguese", "Saracens", "Slavs", "Spanish", "Tatars", "Teutons",
    "Turks", "Vietnamese", "Vikings", "Burgundians", "Sicilians", "Poles", "Bohemians", "Bengalis",
    "Dravidians", "Gurjaras", "Romans", "Armenians", "Georgians",
  ]
  return names[raceId] ?? (raceId < 0 ? "Unknown" : `Civilization ${raceId}`)
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred"
}
