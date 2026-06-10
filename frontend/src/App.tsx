import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Projects from "./pages/Projects";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Dashboard from "./pages/Dashboard";
import Ideas from "./pages/Ideas";
import Proposal from "./pages/Proposal";
import Literature from "./pages/Literature";
import Questionnaire from "./pages/Questionnaire";
import SampleSize from "./pages/SampleSize";
import Biostatistics from "./pages/Biostatistics";
import Hypothesis from "./pages/Hypothesis";
import SPSS from "./pages/SPSS";
import References from "./pages/References";
import Discussion from "./pages/Discussion";
import Manuscript from "./pages/Manuscript";
import Presentation from "./pages/Presentation";
import Integrity from "./pages/Integrity";
import Quality from "./pages/Quality";
import JournalMatch from "./pages/JournalMatch";
import ExportPage from "./pages/Export";
import KnowledgeOcean from "./pages/KnowledgeOcean";
import Grants from "./pages/Grants";
import GrantsDiscover from "./pages/GrantsDiscover";
import GrantWorkspace from "./pages/GrantWorkspace";
import JoinShare from "./pages/JoinShare";
import ParticipantWorkspace from "./pages/ParticipantWorkspace";
import InstallPrompt from "./components/InstallPrompt";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Admin from "./pages/Admin";
import { useAuth } from "./store/auth";
import { ROLE_LABELS } from "./api/auth";

const PRIMARY = [
  { to: "/projects", label: "Projects", end: false },
  { to: "/grants", label: "Grants", end: false },
  { to: "/dashboard", label: "Engines dashboard", end: false },
  { to: "/ocean", label: "Knowledge Ocean", end: false },
];

const TOOLS = [
  { to: "/ideas", label: "Idea Generator" },
  { to: "/literature", label: "Literature Review" },
  { to: "/proposal", label: "Proposal" },
  { to: "/questionnaire", label: "Questionnaire" },
  { to: "/sample-size", label: "Sample Size" },
  { to: "/biostatistics", label: "Biostatistics" },
  { to: "/hypothesis", label: "Hypothesis" },
  { to: "/spss", label: "SPSS" },
  { to: "/references", label: "References" },
  { to: "/discussion", label: "Discussion" },
  { to: "/manuscript", label: "Manuscript" },
  { to: "/presentation", label: "Presentation" },
  { to: "/integrity", label: "Integrity" },
  { to: "/quality", label: "Quality Assurance" },
  { to: "/journals", label: "Journal Matching" },
  { to: "/export", label: "Export" },
];

export default function App() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const {
    loading,
    isAuthenticated,
    mustChangePassword,
    user,
    logout,
    isAdmin,
  } = useAuth();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the drawer is open on mobile.
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  // --- Auth gates ----------------------------------------------------------
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-card">
          <img src="/icon.png" alt="" className="auth-loading-logo" />
          <div className="spinner" />
          <p>Loading OceanFloor&hellip;</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (mustChangePassword) {
    return <ChangePassword />;
  }

  return (
    <div className={`layout${navOpen ? " nav-open" : ""}`}>
      <header className="topbar">
        <button
          className="nav-toggle"
          type="button"
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
          aria-controls="primary-navigation"
          onClick={() => setNavOpen((v) => !v)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>
        <div className="topbar-brand">
          <img src="/icon.png" alt="" className="topbar-logo" />
          <span>OceanFloor</span>
        </div>
      </header>

      <div
        className={`nav-scrim${navOpen ? " show" : ""}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      <aside className="sidebar">
        <div className="brand">
          <img src="/icon.png" alt="" className="brand-logo" />
          <div>
            <h1>OceanFloor</h1>
            <div className="tag">Medical Research Assistant&trade;</div>
          </div>
        </div>
        <nav className="nav" id="primary-navigation">
          {PRIMARY.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "active primary" : "primary")}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="nav-section-label">Standalone engines</div>
          {TOOLS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="nav-section-label">Administration</div>
              <NavLink
                to="/admin"
                className={({ isActive }) => (isActive ? "active primary" : "primary")}
              >
                User Management
              </NavLink>
            </>
          )}
        </nav>
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {(user.full_name || user.username).charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">
                {user.full_name || user.username}
              </span>
              <span className="sidebar-user-role">{ROLE_LABELS[user.role]}</span>
            </div>
            <button
              className="sidebar-logout"
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectWorkspace />} />
          <Route path="/grants" element={<Grants />} />
          <Route path="/grants/discover" element={<GrantsDiscover />} />
          <Route path="/grants/:id" element={<GrantWorkspace />} />
          <Route path="/join/:shareId" element={<JoinShare />} />
          <Route path="/participant/:shareId" element={<ParticipantWorkspace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/proposal" element={<Proposal />} />
          <Route path="/literature" element={<Literature />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/sample-size" element={<SampleSize />} />
          <Route path="/biostatistics" element={<Biostatistics />} />
          <Route path="/hypothesis" element={<Hypothesis />} />
          <Route path="/spss" element={<SPSS />} />
          <Route path="/references" element={<References />} />
          <Route path="/discussion" element={<Discussion />} />
          <Route path="/manuscript" element={<Manuscript />} />
          <Route path="/presentation" element={<Presentation />} />
          <Route path="/integrity" element={<Integrity />} />
          <Route path="/quality" element={<Quality />} />
          <Route path="/journals" element={<JournalMatch />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/ocean" element={<KnowledgeOcean />} />
          {isAdmin && <Route path="/admin" element={<Admin />} />}
          <Route path="/change-password" element={<ChangePassword />} />
        </Routes>
      </main>
      <InstallPrompt />
    </div>
  );
}
