import { NavLink, Navigate, Route, Routes } from "react-router-dom";
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
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <img src="/icon.png" alt="" className="brand-logo" />
          <div>
            <h1>OceanFloor</h1>
            <div className="tag">Medical Research Assistant&trade;</div>
          </div>
        </div>
        <nav className="nav">
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
        </nav>
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
        </Routes>
      </main>
    </div>
  );
}
