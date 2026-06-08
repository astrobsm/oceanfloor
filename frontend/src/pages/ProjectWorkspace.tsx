/**
 * ProjectWorkspace - hosts a single research project and walks the user
 * through the standard health-sciences research pipeline. Each step is a
 * small panel that reads/writes a slice of `project.artifacts` via the
 * Project store. The Discussion and Manuscript panels render in-text
 * citations live from `artifacts.literature.articles`, so when the user
 * uploads more articles the numbering everywhere updates automatically.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Project,
  STEPS,
  StepKey,
  projectsStore,
  useProject,
} from "../store/projects";
import OverviewPanel from "./project/OverviewPanel";
import IdeaPanel from "./project/IdeaPanel";
import LiteraturePanel from "./project/LiteraturePanel";
import ProposalPanel from "./project/ProposalPanel";
import SampleSizePanel from "./project/SampleSizePanel";
import QuestionnairePanel from "./project/QuestionnairePanel";
import EthicsPanel from "./project/EthicsPanel";
import DataPanel from "./project/DataPanel";
import AnalysisPanel from "./project/AnalysisPanel";
import ResultsPanel from "./project/ResultsPanel";
import DiscussionPanel from "./project/DiscussionPanel";
import ManuscriptPanel from "./project/ManuscriptPanel";
import JournalPanel from "./project/JournalPanel";
import ExportPanel from "./project/ExportPanel";
import CollaboratorsPanel from "./project/CollaboratorsPanel";

type WorkspaceView = "step" | "collab";

export default function ProjectWorkspace() {
  const { id = "" } = useParams<{ id: string }>();
  const project = useProject(id);
  const nav = useNavigate();
  const [view, setView] = useState<WorkspaceView>("step");

  if (!project) {
    return (
      <div>
        <h2>Project not found</h2>
        <p>
          This project may have been deleted. <a href="#/projects">Back to projects</a>
        </p>
      </div>
    );
  }

  function go(step: StepKey) {
    projectsStore.setStep(project!.id, step);
  }

  const currentIdx = STEPS.findIndex((s) => s.key === project.currentStep);
  const meta = STEPS[currentIdx] ?? STEPS[0];

  return (
    <div className="project-workspace">
      <aside className="stepper">
        <button className="ghost back-btn" onClick={() => nav("/projects")}>
          All projects
        </button>
        <h3 className="stepper-title">{project.title}</h3>
        <p className="muted stepper-meta">
          {project.field.replace(/_/g, " ")} - {project.design.replace(/_/g, " ")}
        </p>
        <ol className="stepper-list">
          {STEPS.map((s, i) => {
            const done = stepCompleted(project, s.key);
            const active = project.currentStep === s.key;
            return (
              <li
                key={s.key}
                className={
                  (active ? "active " : "") + (done ? "done" : "pending")
                }
              >
                <button type="button" onClick={() => go(s.key)}>
                  <span className="step-num">{done ? "✓" : i + 1}</span>
                  <span className="step-label">{s.short}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button
          className={
            "ghost collab-toggle " + (view === "collab" ? "active" : "")
          }
          type="button"
          onClick={() => setView(view === "collab" ? "step" : "collab")}
        >
          {view === "collab" ? "← Back to workflow" : "Collaborators →"}
        </button>
      </aside>

      <section className="step-content">
        {view === "collab" ? (
          <>
            <header className="step-header">
              <div>
                <h2>Collaborators</h2>
                <p className="muted">
                  Generate a sharable link, issue PINs and track activity in
                  real time. Participants help with data entry on the steps you
                  choose.
                </p>
              </div>
              <div className="row-buttons">
                <button className="ghost" onClick={() => setView("step")}>
                  ← Back to workflow
                </button>
              </div>
            </header>
            <CollaboratorsPanel project={project} />
          </>
        ) : (
          <>
            <header className="step-header">
              <div>
                <h2>{meta.label}</h2>
                <p className="muted">{meta.hint}</p>
              </div>
              <div className="row-buttons">
                {currentIdx > 0 && (
                  <button
                    className="ghost"
                    onClick={() => go(STEPS[currentIdx - 1].key)}
                  >
                    ← {STEPS[currentIdx - 1].short}
                  </button>
                )}
                {currentIdx < STEPS.length - 1 && (
                  <button onClick={() => go(STEPS[currentIdx + 1].key)}>
                    {STEPS[currentIdx + 1].short} →
                  </button>
                )}
              </div>
            </header>
            <StepPanel project={project} stepKey={project.currentStep} />
          </>
        )}
      </section>
    </div>
  );
}

function StepPanel({
  project,
  stepKey,
}: {
  project: Project;
  stepKey: StepKey;
}) {
  switch (stepKey) {
    case "overview":
      return <OverviewPanel project={project} />;
    case "idea":
      return <IdeaPanel project={project} />;
    case "literature":
      return <LiteraturePanel project={project} />;
    case "proposal":
      return <ProposalPanel project={project} />;
    case "sample_size":
      return <SampleSizePanel project={project} />;
    case "questionnaire":
      return <QuestionnairePanel project={project} />;
    case "ethics":
      return <EthicsPanel project={project} />;
    case "data":
      return <DataPanel project={project} />;
    case "analysis":
      return <AnalysisPanel project={project} />;
    case "results":
      return <ResultsPanel project={project} />;
    case "discussion":
      return <DiscussionPanel project={project} />;
    case "manuscript":
      return <ManuscriptPanel project={project} />;
    case "journal":
      return <JournalPanel project={project} />;
    case "export":
      return <ExportPanel project={project} />;
  }
}

function stepCompleted(project: Project, key: StepKey): boolean {
  const a = project.artifacts;
  switch (key) {
    case "overview":
      return Boolean(project.title);
    case "idea":
      return Boolean(a.idea?.question);
    case "literature":
      return Boolean(a.literature?.articles?.length);
    case "proposal":
      return Boolean(a.proposal?.aim);
    case "sample_size":
      return Boolean(a.sample_size?.result);
    case "questionnaire":
      return Boolean(a.questionnaire?.sections?.length);
    case "ethics":
      return Boolean(a.ethics?.consent);
    case "data":
      return Boolean(a.data?.raw);
    case "analysis":
      return Boolean(a.analysis?.results);
    case "results":
      return Boolean(a.results?.narrative);
    case "discussion":
      return Boolean(a.discussion?.body);
    case "manuscript":
      return Boolean(a.manuscript?.abstract);
    case "journal":
      return Boolean(a.journal?.selected);
    case "export":
      return false;
  }
}
