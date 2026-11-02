import { afterEach, describe, expect, it, vi } from "vitest"
import {
  findAdvertisements,
  getAvatarStats,
  getInventory,
  getLeaderboard,
  getNews,
  getPersonalStats,
  getRecentMatchHistory,
  parseLeaderboardDefinitions,
  parseRawRows,
} from "./community"

afterEach(() => {
  vi.unstubAllGlobals()
})

function profileInfo(id: number, alias: string): unknown[] {
  return [1, id, `/steam/${id}`, null, alias, alias, "", id, 100, 5, 0, null, String(id + 1000), 3, []]
}

describe("Community API decoders", () => {
  it("reads leaderboard definitions from the public resource envelope", () => {
    const definitions = [
      0,
      [[1, 2, 1, -1, -1]],
      [[1, "SOLO_DM_RANKED", 1], [3, "SOLO_RM_RANKED", 1]],
      [],
    ]

    expect(parseLeaderboardDefinitions(definitions)).toEqual([
      { id: 1, name: "SOLO_DM_RANKED" },
      { id: 3, name: "SOLO_RM_RANKED" },
    ])
  })

  it("decodes leaderboard profiles and ranked stats by matching their positions", async () => {
    const payload = [
      0,
      [],
      [profileInfo(42, "Knight")],
      [[42, 3, 8, 2, 1, 0, 0, 7, 100, -1, -1, 0, 1210, 1793000000, 7, 0, 1300]],
    ]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))))

    const entries = await getLeaderboard(3, 1, 100)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      rank: 7,
      leaderboardId: 3,
      rating: 1210,
      highestRating: 1300,
      wins: 8,
      losses: 2,
      profile: {
        id: 42,
        alias: "Knight",
        platformPath: "/steam/42",
        platformUserId: "1042",
        accountType: 3,
      },
    })
  })

  it("decodes recent match results and before/after ratings", async () => {
    const member = [99, 42, 2, 42, 0, 3, 1, 2, 0, 1, 1180, 1210, 0]
    const payload = [0, [[99, 42, "Arabia", 2, 26, "", "", "AUTOMATCH", 1793000000, 1793003600, 0, [], [], [], [], [member]]]]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))))

    const matches = await getRecentMatchHistory([42])

    expect(matches).toEqual([{
      id: 99,
      mapName: "Arabia",
      matchTypeId: 26,
      description: "AUTOMATCH",
      startedAt: 1793000000,
      finishedAt: 1793003600,
      players: [{
        profileId: 42,
        raceId: 2,
        teamId: 0,
        wins: 3,
        losses: 1,
        streak: 2,
        result: 1,
        oldRating: 1180,
        newRating: 1210,
      }],
    }])
    const requestedUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string, "http://localhost")
    expect(requestedUrl.pathname).toBe("/community/leaderboard/getRecentMatchHistory")
    expect(requestedUrl.searchParams.get("profile_ids")).toBe("[42]")
  })

  it("decodes AoE2 lobby peers, advertised IPs and game settings", async () => {
    const peer = [7, 42, -1, 42, 2, 0, "192.168.1.42"]
    const advertisement = [
      12, 123, "0", "", "", "", 42, 1, "Evening game", "Evening game",
      1, "Arabia", "", 0, 8, "", 26, [peer], 0, 0, 1, 30, 0, 1, null, "eastus", null,
    ]
    const payload = [0, [advertisement], [profileInfo(42, "Knight")]]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))))

    const result = await findAdvertisements("age2")

    expect(result.profiles[0].alias).toBe("Knight")
    expect(result.lobbies[0]).toMatchObject({
      id: 12,
      hostProfileId: 42,
      description: "Evening game",
      mapName: "Arabia",
      maxPlayers: 8,
      matchTypeId: 26,
      observers: 0,
      observersEnabled: true,
      observerDelay: 30,
      isLan: true,
      relayRegion: "eastus",
      peers: [{ profileId: 42, raceId: 2, teamId: 0, ip: "192.168.1.42" }],
    })
  })

  it("unwraps positional achievement resources without inventing awards", () => {
    const definitions = [0, [[1, "FIRST_WIN"]], []]
    expect(parseRawRows(definitions)).toEqual([[1, "FIRST_WIN"]])
  })

  it("requests and decodes profiles, news, avatar stats, and inventory", async () => {
    const leaderboard = [
      0,
      [],
      [profileInfo(42, "Knight")],
      [[42, 3, 8, 2, 1, 0, 0, 7, 100, -1, -1, 0, 1210, 1793000000, 7, 0, 1300]],
    ]
    const news = [0, [[7, "Tournament", "This weekend", 0, "plain", "Join us", "Full details", 0, 1793000000, 1794000000]], []]
    const avatar = [0, [[15, 42, 99, "badge", 1793000000]]]
    const inventory = [
      0,
      [[42, [[5, 1, 12, 42, 100, 0, "{\"skin\":\"gold\"}", 1793000000, 3, 0, 1, 4]]]],
      [[42, [[3, 1, 2, 3, 20, 0, 1, 0, 1]]]],
    ]
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(leaderboard)))
      .mockResolvedValueOnce(new Response(JSON.stringify(news)))
      .mockResolvedValueOnce(new Response(JSON.stringify(avatar)))
      .mockResolvedValueOnce(new Response(JSON.stringify(inventory))))

    const profiles = await getPersonalStats({ aliases: ["Knight"] })
    const articles = await getNews()
    const avatarStats = await getAvatarStats("/steam/42")
    const items = await getInventory([42])

    expect(profiles[0].profile.alias).toBe("Knight")
    expect(articles[0]).toMatchObject({ id: 7, title: "Tournament", summary: "Join us", visibleAt: 1793000000 })
    expect(avatarStats[0]).toMatchObject({ statId: 15, profileId: 42, value: 99 })
    expect(items.itemsByProfile.get("42")?.[0]).toMatchObject({ id: 5, definitionId: 12, metadata: "{\"skin\":\"gold\"}" })
    expect(items.locations[0]).toMatchObject({ id: 3, categoryId: 3, maxItems: 20 })

    const requestedUrls = vi.mocked(fetch).mock.calls.map(([url]) => new URL(url as string, "http://localhost"))
    expect(requestedUrls[0].searchParams.get("aliases")).toBe("[\"Knight\"]")
    expect(requestedUrls.map((url) => url.pathname)).toEqual([
      "/community/leaderboard/GetPersonalStat",
      "/community/news/getNews",
      "/community/leaderboard/GetAvatarStatForProfile",
      "/community/item/getInventoryByProfileIDs",
    ])
  })
})
