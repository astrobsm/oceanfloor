import { Link } from "react-router-dom";

interface Engine {
  to: string;
  title: string;
  blurb: string;
}

const ENGINES: Engine[] = [
  { to: "/ideas", title: "Research Idea Generation", blurb: "Generate, score, and rank novel research questions from a clinical context." },
  { to: "/proposal", title: "Research Proposal", blurb: "Draft a multi-section IMRAD+ proposal with rationale and design." },
  { to: "/literature", title: "Literature Review", blurb: "Search Crossref & Europe PMC. Verifiable DOIs only — never fabricated." },
  { to: "/questionnaire", title: "Questionnaire & Data Collection", blurb: "Build instruments; export to CSV, REDCap, Kobo XLSForm, or ODK XForm." },
  { to: "/sample-size", title: "Sample Size", blurb: "Closed-form sample-size for cross-sectional, mean, proportion, and RCT designs." },
  { to: "/biostatistics", title: "Biostatistics", blurb: "Descriptive statistics + test recommendation (parametric / non-parametric)." },
  { to: "/hypothesis", title: "Hypothesis", blurb: "Draft H0/H1, recommended tests, and assumption checks." },
  { to: "/spss", title: "SPSS Compatibility", blurb: "Generate an SPSS data dictionary (CSV) and runnable .sps syntax file." },
  { to: "/references", title: "Reference Management", blurb: "Format references in Vancouver / AMA / APA7 / Harvard / Nature." },
  { to: "/discussion", title: "Discussion & Interpretation", blurb: "Draft interpretation, comparisons, implications, limitations, future work." },
  { to: "/manuscript", title: "Manuscript Writing", blurb: "Assemble an IMRAD manuscript skeleton with section drafts." },
  { to: "/presentation", title: "Presentation", blurb: "Build slide decks for defenses, conferences, journal clubs." },
  { to: "/integrity", title: "Academic Integrity", blurb: "Citation coverage assessment. Never claims zero plagiarism." },
  { to: "/quality", title: "Quality Assurance", blurb: "Weighted composite score with grade + actionable recommendations." },
  { to: "/journals", title: "Journal Matching", blurb: "Rank candidate journals by scope fit, IF, and open-access preference." },
  { to: "/export", title: "Export", blurb: "Render to DOCX, PPTX, XLSX, MD, HTML, JSON, CSV, or LaTeX." },
  { to: "/ocean", title: "Knowledge Ocean Repository", blurb: "Your local repository of saved engine outputs across this project." },
];

export default function Dashboard() {
  return (
    <div>
      <h2>Research Ecosystem</h2>
      <p className="disclaimer">
        OceanFloor assists research workflows. It is not a clinical decision-support or diagnostic
        tool. All AI output requires expert human verification.
      </p>
      <div className="engine-grid">
        {ENGINES.map((e) => (
          <Link key={e.to} to={e.to} className="engine-card">
            <h3>{e.title}</h3>
            <p>{e.blurb}</p>
            <span className="open-link">Open &rarr;</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
