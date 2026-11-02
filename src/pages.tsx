import { useCallback, useState, type FormEvent, type ReactNode } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  civilizationName,
  displayMapName,
  findAdvertisements,
  findClans,
  getAchievements,
  getAvailableAchievements,
  getAvailableCommunityEvents,
  getAvailableLeaderboards,
  getAvatarStats,
  getClanInfo,
  getErrorMessage,
  getInventory,
  getLeaderboard,
  getNews,
  getPersonalStats,
  getRecentMatchHistory,
  leaderboardName,
  parseLeaderboardDefinitions,
  parseRawRows,
  type LeaderboardEntry,
  type Lobby,
  type MatchRecord,
  type NewsItem,
  type Profile,
} from "./community"
import { useRemote } from "./useRemote"

function Loading({ label = "Loading community data…" }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" />{label}</div>
}

function ErrorNotice({ message }: { message: string }) {
  return <div className="error-notice" role="alert"><strong>Could not load this data.</strong><span>{message}</span></div>
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state"><span className="empty-mark">✦</span><p>{children}</p></div>
}

function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>
        {action}
      </div>
      {children}
    </section>
  )
}

function ProfileAnchor({ profile, children }: { profile: Pick<Profile, "id">; children: ReactNode }) {
  return <Link to={`/players/${profile.id}`}>{children}</Link>
}

function StatCard({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
}

function timestamp(value: number): string {
  if (!value) return "—"
  const date = new Date(value * 1000)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString()
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="news-card">
      <div className="news-card-top"><span className="eyebrow">NEWS · {String(item.id)}</span><time>{timestamp(item.visibleAt)}</time></div>
      <h3>{item.title || "Community update"}</h3>
      {item.subtitle && <p className="news-subtitle">{item.subtitle}</p>}
      <p className="news-summary">{item.summary || item.body || "No article summary was provided."}</p>
      {item.body && item.body !== item.summary && <details><summary>Read more</summary><p>{item.body}</p></details>}
    </article>
  )
}

function ProfileName({ profileId, profiles }: { profileId: number; profiles: Profile[] }) {
  const profile = profiles.find((item) => item.id === profileId)
  const name = profile?.alias || `Player ${profileId}`
  return <ProfileAnchor profile={{ id: profileId }}>{name}</ProfileAnchor>
}

function MatchCard({ match, profiles }: { match: MatchRecord; profiles: Profile[] }) {
  return (
    <article className="match-card">
      <div className="match-heading">
        <div><p className="eyebrow">MATCH #{match.id}</p><h3>{displayMapName(match.mapName)}</h3></div>
        <span className="badge">{match.matchTypeId === 26 ? "Ranked automatch" : "Recorded match"}</span>
      </div>
      <div className="match-meta"><span>{timestamp(match.finishedAt)}</span><span>{match.startedAt && match.finishedAt ? `${Math.max(0, Math.round((match.finishedAt - match.startedAt) / 60))} min` : "Duration unavailable"}</span></div>
      <div className="match-players">
        {match.players.map((player) => (
          <div className="match-player" key={`${match.id}-${player.profileId}`}>
            <div><strong><ProfileName profileId={player.profileId} profiles={profiles} /></strong><small>{civilizationName(player.raceId)} · team {player.teamId || "—"}</small></div>
            <span className={`result-pill ${player.result === 1 ? "win" : "loss"}`}>{player.result === 1 ? "Victory" : "Defeat"}</span>
            {match.matchTypeId === 26 && <span className="rating-change">{player.oldRating} → {player.newRating}</span>}
          </div>
        ))}
      </div>
    </article>
  )
}

function ProfileTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return <Empty>No profiles were returned by the Community API.</Empty>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Rank</th><th>Player</th><th>Profile ID</th><th>Rating</th><th>Games</th><th>Wins</th><th>Losses</th><th>Level</th></tr></thead>
        <tbody>{entries.map((entry) => (
          <tr key={entry.profile.id}>
            <td>#{entry.rank}</td>
            <td><ProfileAnchor profile={entry.profile}>{entry.profile.alias}</ProfileAnchor></td>
            <td className="mono">{entry.profile.id}</td>
            <td><strong className="rating">{entry.rating}</strong></td>
            <td>{entry.wins + entry.losses}</td><td>{entry.wins}</td><td>{entry.losses}</td>
            <td>{entry.profile.level > 0 && entry.profile.level !== 9999 ? entry.profile.level : "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function HomePage() {
  const loadNews = useCallback(() => getNews(), [])
  const loadLobbies = useCallback(() => findAdvertisements(), [])
  const loadLadder = useCallback(() => getLeaderboard(3, 1, 5), [])
  const news = useRemote(loadNews)
  const lobbies = useRemote(loadLobbies)
  const ladder = useRemote(loadLadder)
  const refresh = () => {
    news.refresh()
    lobbies.refresh()
    ladder.refresh()
  }
  const participants = new Set(lobbies.data?.lobbies.flatMap((lobby) => lobby.peers.map((peer) => peer.profileId)) ?? [])

  return (
    <>
      <section className="realm-banner">
        <div><p className="eyebrow">THE REALM IS OPEN</p><h2>Welcome to your Age Server community</h2><p>Ranked profiles, open rooms and server news, delivered by the public Community API.</p></div>
        <button className="button gold-button" onClick={refresh} type="button">Refresh realm</button>
      </section>
      <section className="stat-grid">
        <StatCard label="Joinable rooms" value={lobbies.data?.lobbies.length ?? "—"} note="Visible advertisements" />
        <StatCard label="Players in rooms" value={lobbies.data ? participants.size : "—"} note="Unique profiles in listed rooms" />
        <StatCard label="Ranked profiles" value={ladder.data?.length ?? "—"} note="Profiles on the loaded ladder page" />
        <StatCard label="News articles" value={news.data?.length ?? "—"} note="Configured by the server" />
      </section>
      <div className="dashboard-grid">
        <Panel title="Open rooms" eyebrow="COMMUNITY ACTIVITY" action={<Link to="/lobbies">View all →</Link>}>
          {lobbies.loading && <Loading />}
          {lobbies.error && <ErrorNotice message={lobbies.error} />}
          {lobbies.data && (lobbies.data.lobbies.length
            ? <LobbyList lobbies={lobbies.data.lobbies.slice(0, 5)} profiles={lobbies.data.profiles} />
            : <Empty>No visible, joinable rooms are currently advertised.</Empty>)}
        </Panel>
        <Panel title="Latest news" eyebrow="FROM YOUR SERVER" action={<Link to="/news">All news →</Link>}>
          {news.loading && <Loading />}
          {news.error && <ErrorNotice message={news.error} />}
          {news.data && (news.data.length
            ? <div className="news-list">{news.data.slice(0, 3).map((item) => <NewsCard key={item.id} item={item} />)}</div>
            : <Empty>The server has not configured any news.</Empty>)}
        </Panel>
      </div>
      <Panel title="Top ranked profiles" eyebrow="1V1 RANDOM MAP RANKED" action={<Link to="/leaderboard">Open leaderboard →</Link>}>
        {ladder.loading && <Loading />}
        {ladder.error && <ErrorNotice message={ladder.error} />}
        {ladder.data && <ProfileTable entries={ladder.data} />}
      </Panel>
      <p className="privacy-note">Room participant IP addresses are included only where the Community API exposes them. The server administrator controls which information is available.</p>
    </>
  )
}

function LobbyList({ lobbies, profiles }: { lobbies: Lobby[]; profiles: Profile[] }) {
  return (
    <div className="lobby-list">
      {lobbies.map((lobby) => {
        const host = profiles.find((profile) => profile.id === lobby.hostProfileId)?.alias || `Player ${lobby.hostProfileId}`
        const hostPeer = lobby.peers.find((peer) => peer.profileId === lobby.hostProfileId)
        return (
          <Link className="lobby-row" to={`/lobbies/${lobby.id}`} key={lobby.id}>
            <span className="lobby-mark">⚔</span>
            <span className="lobby-main"><strong>{lobby.description || displayMapName(lobby.mapName)}</strong><small>{displayMapName(lobby.mapName)} · Host {host}</small></span>
            <span className="lobby-count">{lobby.peers.length}/{lobby.maxPlayers || "—"}</span>
            {hostPeer?.ip && <span className="mono lobby-ip">{hostPeer.ip}</span>}
          </Link>
        )
      })}
    </div>
  )
}

export function LobbiesPage() {
  const load = useCallback(() => findAdvertisements(), [])
  const result = useRemote(load)
  return (
    <>
      <section className="realm-banner compact-banner"><div><p className="eyebrow">ROOMS IN THE REALM</p><h2>Visible and joinable game advertisements</h2><p>This endpoint does not expose a separate matchmaking queue or battle-server registry.</p></div><button className="button secondary" onClick={result.refresh} type="button">Refresh</button></section>
      <Panel title="Current lobbies" eyebrow="PUBLIC ADVERTISEMENTS">
        {result.loading && <Loading />}
        {result.error && <ErrorNotice message={result.error} />}
        {result.data && (result.data.lobbies.length
          ? <LobbyList lobbies={result.data.lobbies} profiles={result.data.profiles} />
          : <Empty>No visible, joinable rooms were returned.</Empty>)}
      </Panel>
    </>
  )
}

export function LobbyDetailPage() {
  const { lobbyId = "" } = useParams()
  const id = Number(lobbyId)
  const load = useCallback(async () => {
    const data = await findAdvertisements()
    return { ...data, lobby: data.lobbies.find((item) => item.id === id) }
  }, [id])
  const result = useRemote(load)

  if (result.loading) return <Loading />
  if (result.error) return <ErrorNotice message={result.error} />
  const data = result.data
  if (!data?.lobby) return <Empty>This advertisement is no longer available.</Empty>

  const lobby = data.lobby
  const host = data.profiles.find((profile) => profile.id === lobby.hostProfileId)
  return (
    <Panel title={lobby.description || displayMapName(lobby.mapName)} eyebrow={`LOBBY #${lobby.id}`}>
      <div className="detail-grid">
        <div><span>Host</span><strong><ProfileAnchor profile={{ id: lobby.hostProfileId }}>{host?.alias || `Player ${lobby.hostProfileId}`}</ProfileAnchor></strong></div>
        <div><span>Map</span><strong>{displayMapName(lobby.mapName)}</strong></div>
        <div><span>Room type</span><strong>{lobby.matchTypeId === 26 ? "Ranked automatch" : "Custom room"}</strong></div>
        <div><span>Players</span><strong>{lobby.peers.length} / {lobby.maxPlayers || "—"}</strong></div>
        <div><span>Relay region</span><strong>{lobby.relayRegion || (lobby.isLan ? "LAN" : "—")}</strong></div>
        <div><span>Observers</span><strong>{lobby.observersEnabled ? `Allowed · ${lobby.observerDelay}s delay` : "Not allowed"}</strong></div>
        <div><span>State</span><strong>Open · state {lobby.state}</strong></div>
        <div><span>Started</span><strong>{timestamp(lobby.startedAt ?? 0)}</strong></div>
      </div>
      <h3 className="subheading">Players in this room</h3>
      <div className="table-wrap"><table><thead><tr><th>Player</th><th>Profile</th><th>IP address</th><th>Civilization</th><th>Team</th></tr></thead><tbody>
        {lobby.peers.map((peer) => (
          <tr key={peer.profileId}><td><ProfileName profileId={peer.profileId} profiles={data.profiles} /></td><td className="mono">{peer.profileId}</td><td className="mono">{peer.ip || "Not provided"}</td><td>{civilizationName(peer.raceId)}</td><td>{peer.teamId || "—"}</td></tr>
        ))}
        {!lobby.peers.length && <tr><td colSpan={5} className="empty">The advertisement contains no player details.</td></tr>}
      </tbody></table></div>
      <p className="privacy-note">The public advertisement exposes participant IPs when the server includes them. Use this page only for servers whose administrators intentionally publish this information.</p>
    </Panel>
  )
}

export function LeaderboardPage() {
  const [boardId, setBoardId] = useState(3)
  const [page, setPage] = useState(1)
  const loadDefinitions = useCallback(async () => parseLeaderboardDefinitions(await getAvailableLeaderboards()), [])
  const definitions = useRemote(loadDefinitions)
  const loadEntries = useCallback(() => getLeaderboard(boardId, (page - 1) * 100 + 1, 100), [boardId, page])
  const entries = useRemote(loadEntries)
  const boards = definitions.data ?? []
  const selectedBoard = boards.find((board) => board.id === boardId)

  return (
    <>
      <section className="realm-banner compact-banner"><div><p className="eyebrow">SERVER RANKINGS</p><h2>Compare ranked profiles</h2><p>Leaderboard pages are loaded from the server and capped at 1,000 entries per API request.</p></div>
        <label className="inline-field">Leaderboard<select value={boardId} onChange={(event) => { setBoardId(Number(event.target.value)); setPage(1) }}>
          {boards.length ? boards.map((board) => <option value={board.id} key={board.id}>{leaderboardName(board.name)}</option>) : <option value={3}>1v1 Random Map Ranked (default)</option>}
        </select></label>
      </section>
      {definitions.error && <ErrorNotice message={definitions.error} />}
      <Panel title={selectedBoard ? leaderboardName(selectedBoard.name) : "1v1 Random Map Ranked"} eyebrow="RANKED LADDER"
        action={<span className="muted">Page {page} · up to 100 profiles</span>}>
        {entries.loading && <Loading />}
        {entries.error && <ErrorNotice message={entries.error} />}
        {entries.data && <ProfileTable entries={entries.data} />}
        <div className="pagination">
          <button type="button" className="button secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Previous</button>
          <span>Page {page}</span>
          <button type="button" className="button secondary" disabled={(entries.data?.length ?? 0) < 100} onClick={() => setPage((value) => value + 1)}>Next →</button>
        </div>
      </Panel>
    </>
  )
}

export function PlayersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [searchError, setSearchError] = useState("")
  const [searching, setSearching] = useState(false)
  const load = useCallback(() => getLeaderboard(3, 1, 100), [])
  const result = useRemote(load)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearchError("")
    const value = search.trim()
    if (!value) return
    setSearching(true)
    try {
      const profileId = Number(value)
      const profiles = await getPersonalStats(Number.isSafeInteger(profileId) && profileId > 0
        ? { profileIds: [profileId] }
        : { aliases: [value] })
      if (!profiles.length) {
        setSearchError("No matching online or stored profile was returned.")
        return
      }
      navigate(`/players/${profiles[0].profile.id}`)
    } catch (error) {
      setSearchError(getErrorMessage(error))
    } finally {
      setSearching(false)
    }
  }

  return (
    <>
      <section className="player-intro">
        <div><p className="eyebrow">COMMUNITY ROSTER</p><h2>Find a player profile</h2><p>The API can search by profile ID or an exact alias. The directory below is the selected ranked leaderboard, not a complete online-player list.</p></div>
        <form className="search-form" onSubmit={submit}><label htmlFor="player-search">Player name or profile ID</label><div><input id="player-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. 123456 or PlayerName" /><button className="button gold-button" type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</button></div></form>
      </section>
      {searchError && <ErrorNotice message={searchError} />}
      <Panel title="Ranked profiles" eyebrow="1V1 RANDOM MAP RANKED" action={<button className="button secondary" onClick={result.refresh} type="button">Refresh</button>}>
        {result.loading && <Loading />}
        {result.error && <ErrorNotice message={result.error} />}
        {result.data && <ProfileTable entries={result.data} />}
      </Panel>
    </>
  )
}

interface HistoryData {
  matches: MatchRecord[]
  profiles: Profile[]
}

async function loadHistory(profileId: number): Promise<HistoryData> {
  const matches = await getRecentMatchHistory([profileId])
  const ids = [...new Set([profileId, ...matches.flatMap((match) => match.players.map((player) => player.profileId))])]
  const entries = await getPersonalStats({ profileIds: ids })
  return { matches, profiles: entries.map((entry) => entry.profile) }
}

export function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialId = Number(searchParams.get("profile") || 0)
  const [profileId, setProfileId] = useState(Number.isSafeInteger(initialId) && initialId > 0 ? initialId : 0)
  const [input, setInput] = useState(profileId ? String(profileId) : "")
  const [validationError, setValidationError] = useState("")
  const load = useCallback(() => profileId ? loadHistory(profileId) : Promise.resolve({ matches: [], profiles: [] }), [profileId])
  const result = useRemote(load)
  const historyData = result.data

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = Number(input.trim())
    if (!Number.isSafeInteger(id) || id <= 0) {
      setValidationError("Enter a positive numeric profile ID to request match history.")
      return
    }
    setValidationError("")
    setProfileId(id)
    setSearchParams({ profile: String(id) })
  }

  return (
    <>
      <section className="realm-banner compact-banner"><div><p className="eyebrow">PROFILE-BASED HISTORY</p><h2>Browse recent reported matches</h2><p>The public endpoint requires profile IDs and returns up to 30 matches for the requested profiles; there is no global match-search endpoint.</p></div></section>
      <Panel title="Find match history">
        <form className="search-form horizontal-search" onSubmit={submit}><label htmlFor="history-profile">Profile ID</label><div><input id="history-profile" inputMode="numeric" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Enter a profile ID" /><button className="button gold-button" type="submit">Load history</button></div></form>
        {validationError && <ErrorNotice message={validationError} />}
      </Panel>
      {profileId > 0 && <Panel title={`Recent matches for profile ${profileId}`} eyebrow="COMMUNITY MATCH HISTORY" action={<button className="button secondary" onClick={result.refresh} type="button">Refresh</button>}>
        {result.loading && <Loading />}
        {result.error && <ErrorNotice message={result.error} />}
        {historyData && (historyData.matches.length
          ? <div className="match-list">{historyData.matches.map((match) => <MatchCard key={match.id} match={match} profiles={historyData.profiles} />)}</div>
          : <Empty>No match history was returned for this profile.</Empty>)}
      </Panel>}
    </>
  )
}

interface ProfileExtras {
  achievements?: unknown
  inventory?: Awaited<ReturnType<typeof getInventory>>
  avatarStats?: Awaited<ReturnType<typeof getAvatarStats>>
  optionalErrors: string[]
}

interface ProfilePageData {
  entry: LeaderboardEntry
  matches: MatchRecord[]
  participants: Profile[]
  extras?: ProfileExtras
  extrasError?: string
}

async function loadProfile(profileId: number): Promise<ProfilePageData> {
  const entries = await getPersonalStats({ profileIds: [profileId] })
  if (!entries.length) throw new Error("This profile is not online and has no stored public profile data.")
  const entry = entries[0]
  const [historyResult, achievementResult, inventoryResult, avatarResult] = await Promise.allSettled([
    getRecentMatchHistory([profileId]),
    getAchievements([profileId]),
    getInventory([profileId]),
    entry.profile.platformPath ? getAvatarStats(entry.profile.platformPath) : Promise.resolve([]),
  ])
  const matches = historyResult.status === "fulfilled" ? historyResult.value : []
  const participantIds = [...new Set(matches.flatMap((match) => match.players.map((player) => player.profileId)))]
  const participantResult = participantIds.length ? await Promise.allSettled([getPersonalStats({ profileIds: participantIds })]) : []
  const participants = participantResult[0]?.status === "fulfilled"
    ? participantResult[0].value.map((participant) => participant.profile)
    : []
  const optionalErrors = [
    historyResult.status === "rejected" ? `Match history: ${getErrorMessage(historyResult.reason)}` : "",
    achievementResult.status === "rejected" ? `Achievements: ${getErrorMessage(achievementResult.reason)}` : "",
    inventoryResult.status === "rejected" ? `Inventory: ${getErrorMessage(inventoryResult.reason)}` : "",
    avatarResult.status === "rejected" ? `Avatar stats: ${getErrorMessage(avatarResult.reason)}` : "",
    participantResult[0]?.status === "rejected" ? `Match profile names: ${getErrorMessage(participantResult[0].reason)}` : "",
  ].filter(Boolean)

  return {
    entry,
    matches,
    participants,
    extras: {
      ...(achievementResult.status === "fulfilled" ? { achievements: achievementResult.value } : {}),
      ...(inventoryResult.status === "fulfilled" ? { inventory: inventoryResult.value } : {}),
      ...(avatarResult.status === "fulfilled" ? { avatarStats: avatarResult.value } : {}),
      optionalErrors,
    },
  }
}

function rawRowsAsText(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function PlayerProfilePage() {
  const { profileId: rawId = "" } = useParams()
  const profileId = Number(rawId)
  const load = useCallback(() => {
    if (!Number.isSafeInteger(profileId) || profileId <= 0) return Promise.reject(new Error("Invalid profile ID."))
    return loadProfile(profileId)
  }, [profileId])
  const result = useRemote(load)

  if (result.loading) return <Loading label="Loading profile, inventory and match history…" />
  if (result.error) return <ErrorNotice message={result.error} />
  if (!result.data) return <Empty>Profile data is unavailable.</Empty>

  const { entry, matches, participants, extras } = result.data
  const items = extras?.inventory?.itemsByProfile.get(String(profileId)) ?? []
  const locations = extras?.inventory?.locations ?? []
  const awards = parseRawRows(extras?.achievements)

  return (
    <>
      <section className="player-intro">
        <div><p className="eyebrow">PUBLIC PLAYER PROFILE</p><h2>{entry.profile.alias}</h2><p>Profile {entry.profile.id} · {entry.profile.platformPath || "Platform path unavailable"}</p></div>
        <strong>{entry.rating}<small> ranked rating</small></strong>
      </section>
      <section className="stat-grid">
        <StatCard label="Ranked games" value={entry.wins + entry.losses} note={`${entry.wins} wins · ${entry.losses} losses`} />
        <StatCard label="Highest rating" value={entry.highestRating} note="Reported by the selected leaderboard" />
        <StatCard label="Profile XP" value={entry.profile.xp.toLocaleString()} note={`Level ${entry.profile.level || "—"}`} />
        <StatCard label="Current streak" value={entry.streak} note="Leaderboard stat" />
      </section>
      {extras?.optionalErrors.map((message) => <ErrorNotice key={message} message={message} />)}
      <Panel title="Recent matches" eyebrow="PROFILE HISTORY" action={<Link to={`/history?profile=${profileId}`}>Open history →</Link>}>
        {matches.length
          ? <div className="match-list">{matches.slice(0, 10).map((match) => <MatchCard key={match.id} match={match} profiles={participants} />)}</div>
          : <Empty>No recent match history was returned for this profile.</Empty>}
      </Panel>
      <div className="two-column">
        <Panel title="Achievements" eyebrow="SERVER AWARDS">
          <p className="section-note">The API returns earned awards for this profile. The server currently does not persist achievement awards.</p>
          {extras?.achievements !== undefined
            ? <pre className="json-block">{rawRowsAsText(awards)}</pre>
            : <p className="section-note">The achievements endpoint could not provide this profile's awards.</p>}
        </Panel>
        <Panel title="Avatar statistics" eyebrow="PROFILE AVATAR DATA">
          {extras?.avatarStats
            ? extras.avatarStats.length
              ? <div className="table-wrap"><table><thead><tr><th>Stat ID</th><th>Value</th><th>Updated</th></tr></thead><tbody>{extras.avatarStats.map((stat, index) => <tr key={`${stat.statId}-${index}`}><td>{stat.statId}</td><td>{String(stat.value)}</td><td>{timestamp(stat.updatedAt)}</td></tr>)}</tbody></table></div>
              : <Empty>No avatar statistics are currently exposed for this loaded profile.</Empty>
            : <p className="section-note">Avatar statistics could not be loaded.</p>}
        </Panel>
      </div>
      <Panel title="Inventory" eyebrow="PROFILE ITEMS">
        {extras?.inventory
          ? items.length
            ? <div className="table-wrap"><table><thead><tr><th>Item</th><th>Definition</th><th>Location</th><th>Durability</th><th>Metadata</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td className="mono">{item.id}</td><td>{item.definitionId}</td><td>{item.locationId}</td><td>{item.durability}</td><td><code>{item.metadata || "—"}</code></td></tr>)}</tbody></table></div>
            : <Empty>The server returned no loaded inventory for this profile.</Empty>
          : <p className="section-note">Inventory could not be loaded.</p>}
        {locations.length > 0 && <details className="locations-details"><summary>Inventory locations ({locations.length})</summary><pre className="json-block">{rawRowsAsText(locations)}</pre></details>}
      </Panel>
      <p className="privacy-note">Inventory and avatar stats may be empty when the profile is not loaded in the server's current process.</p>
    </>
  )
}

export function NewsPage() {
  const load = useCallback(() => getNews(), [])
  const result = useRemote(load)
  return (
    <>
      <section className="realm-banner compact-banner"><div><p className="eyebrow">MESSAGES FROM YOUR COMMUNITY</p><h2>Server news</h2><p>Articles come from the selected AgeLANServer's configured news resource.</p></div><button className="button secondary" onClick={result.refresh} type="button">Refresh</button></section>
      {result.loading && <Loading />}
      {result.error && <ErrorNotice message={result.error} />}
      {result.data && (result.data.length
        ? <div className="news-grid">{result.data.map((item) => <NewsCard key={item.id} item={item} />)}</div>
        : <Empty>The server has not configured any news articles.</Empty>)}
    </>
  )
}

function resourceTitle(value: unknown, index: number): string {
  if (Array.isArray(value)) {
    const label = value.find((item) => typeof item === "string" && item.length > 0)
    return typeof label === "string" ? label.replaceAll("_", " ") : `Entry ${index + 1}`
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>
    for (const key of ["name", "title", "displayName", "id"]) {
      if (typeof record[key] === "string" || typeof record[key] === "number") return String(record[key])
    }
  }
  return `Entry ${index + 1}`
}

function ResourceList({ value }: { value: unknown }) {
  const rows = parseRawRows(value)
  if (!rows.length) return <Empty>The endpoint returned no entries.</Empty>
  return <div className="resource-list">{rows.map((row, index) => (
    <details className="resource-row" key={`${resourceTitle(row, index)}-${index}`}><summary><span className="resource-index">{String(index + 1).padStart(2, "0")}</span>{resourceTitle(row, index)}</summary><pre className="json-block">{rawRowsAsText(row)}</pre></details>
  ))}</div>
}

export function ResourcesPage() {
  const [tab, setTab] = useState<"achievements" | "events" | "clans">("achievements")
  const [clanName, setClanName] = useState("")
  const [clanQuery, setClanQuery] = useState("")
  const [clanData, setClanData] = useState<{ search: unknown; details: unknown }>()
  const [clanError, setClanError] = useState("")
  const [clanLoading, setClanLoading] = useState(false)
  const loadAchievements = useCallback(() => getAvailableAchievements(), [])
  const loadEvents = useCallback(() => getAvailableCommunityEvents(), [])
  const loadClans = useCallback(() => findClans(), [])
  const achievements = useRemote(loadAchievements)
  const events = useRemote(loadEvents)
  const clans = useRemote(loadClans)

  async function searchClan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setClanLoading(true)
    setClanError("")
    setClanData(undefined)
    try {
      const name = clanName.trim()
      const [search, details] = await Promise.all([findClans({ name }), getClanInfo(name)])
      setClanQuery(name)
      setClanData({ search, details })
    } catch (error) {
      setClanError(getErrorMessage(error))
    } finally {
      setClanLoading(false)
    }
  }

  return (
    <>
      <section className="realm-banner compact-banner"><div><p className="eyebrow">SERVER-PROVIDED CONTENT</p><h2>Achievements, events and clans</h2><p>These sections display only what the configured Community API returns for this game.</p></div></section>
      <div className="resource-tabs" role="tablist" aria-label="Community resources">
        {(["achievements", "events", "clans"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </div>
      {tab === "achievements" && <Panel title="Available achievements" eyebrow="GAME DEFINITIONS" action={<button type="button" className="button secondary" onClick={achievements.refresh}>Refresh</button>}>
        {achievements.loading && <Loading />}
        {achievements.error && <ErrorNotice message={achievements.error} />}
        {achievements.data !== undefined && <ResourceList value={achievements.data} />}
      </Panel>}
      {tab === "events" && <Panel title="Available community events" eyebrow="GAME EVENTS" action={<button type="button" className="button secondary" onClick={events.refresh}>Refresh</button>}>
        {events.loading && <Loading />}
        {events.error && <ErrorNotice message={events.error} />}
        {events.data !== undefined && <ResourceList value={events.data} />}
      </Panel>}
      {tab === "clans" && <Panel title="Clan directory" eyebrow="COMMUNITY CLANS" action={<button type="button" className="button secondary" onClick={clans.refresh}>Refresh</button>}>
        {clans.loading && <Loading />}
        {clans.error && <ErrorNotice message={clans.error} />}
        {clans.data !== undefined && <ResourceList value={clans.data} />}
        <form className="search-form horizontal-search" onSubmit={searchClan}><label htmlFor="clan-search">Find a clan</label><div><input id="clan-search" value={clanName} onChange={(event) => setClanName(event.target.value)} placeholder="Clan name" /><button className="button gold-button" type="submit" disabled={clanLoading}>{clanLoading ? "Searching…" : "Search"}</button></div></form>
        {clanError && <ErrorNotice message={clanError} />}
        {clanData && <div className="clan-response"><h3>Search: {clanQuery || "all clans"}</h3><ResourceList value={clanData.search} /><h3>Clan details</h3><ResourceList value={clanData.details} /></div>}
        <p className="section-note">The current server implementation does not store clan records, so these endpoints may return empty results.</p>
      </Panel>}
    </>
  )
}

export function NotFoundPage() {
  return <Panel title="Page not found"><Empty>This section does not exist in the Community API website.</Empty><Link className="button gold-button" to="/">Return to overview</Link></Panel>
}
