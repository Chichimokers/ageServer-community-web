import { BrowserRouter, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom"
import {
  HistoryPage,
  HomePage,
  LobbyDetailPage,
  LobbiesPage,
  LeaderboardPage,
  NewsPage,
  NotFoundPage,
  PlayerProfilePage,
  PlayersPage,
  ResourcesPage,
} from "./pages"
import "./App.css"

const navigation = [
  { to: "/", label: "Overview", icon: "✦", end: true },
  { to: "/lobbies", label: "Lobbies", icon: "⚔" },
  { to: "/leaderboard", label: "Leaderboard", icon: "♛" },
  { to: "/players", label: "Players", icon: "♟" },
  { to: "/history", label: "Match history", icon: "◷" },
  { to: "/news", label: "News", icon: "▤" },
  { to: "/resources", label: "Resources", icon: "✧" },
]

const titles: Record<string, string> = {
  "/": "Realm overview",
  "/lobbies": "Open lobbies",
  "/leaderboard": "Leaderboard",
  "/players": "Player directory",
  "/history": "Recent match history",
  "/news": "Community news",
  "/resources": "Community resources",
}

function Shell() {
  const location = useLocation()
  const title = location.pathname.startsWith("/players/")
    ? "Player profile"
    : location.pathname.startsWith("/lobbies/")
      ? "Lobby details"
      : titles[location.pathname] ?? "Community"

  return (
    <div className="site-shell">
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="Age Server home">
          <img src="/royal-shield.svg" alt="" />
          <span>Age Server</span>
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="api-indicator"><i /> Direct API connection</div>
      </header>

      <main className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">AGE SERVER · COMMUNITY REALM</p>
            <h1>{title}</h1>
          </div>
          <span className="live-state"><i /> Browser → Community API</span>
        </div>
        <Outlet />
      </main>

      <footer className="footer">
        <p>Age Server Community · Read-only public Community API</p>
        <p>
          Age of Empires II: Definitive Edition © Microsoft Corporation. This
          community project is not endorsed by or affiliated with Microsoft.
          Game names and marks belong to their respective owners.
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<HomePage />} />
          <Route path="lobbies" element={<LobbiesPage />} />
          <Route path="lobbies/:lobbyId" element={<LobbyDetailPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="players/:profileId" element={<PlayerProfilePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
