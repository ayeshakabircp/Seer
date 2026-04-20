import { useState, useCallback, useEffect } from "react";
import bgImage from "@assets/f9b26700-c806-4dd2-a868-164b6d07915a_1776700081671.jpg";
import crystalBall from "@assets/649b2204-13ae-41aa-b601-0b4763883612-Photoroom_1776700638205.png";

const CRITERIA_OPTIONS = [
  { id: "navigation", label: "Navigation", default: true },
  { id: "hierarchy", label: "Visual Hierarchy", default: true },
  { id: "density", label: "Information Density", default: true },
  { id: "consistency", label: "Consistency", default: true },
  { id: "accessibility", label: "Accessibility", default: true },
  { id: "errors", label: "Error Handling", default: false },
  { id: "empty", label: "Empty States", default: false },
  { id: "typography", label: "Typography", default: false },
  { id: "colour", label: "Colour & Contrast", default: false },
  { id: "motion", label: "Motion & Feedback", default: false },
  { id: "onboarding", label: "Onboarding", default: false },
];

const PRODUCT_TYPES = ["Web App", "Mobile App", "Dashboard", "Internal Tool", "Other"];

const initialCriteria = CRITERIA_OPTIONS.reduce<Record<string, boolean>>(
  (acc, c) => ({ ...acc, [c.id]: c.default }), {}
);

const MOCK_RESULTS = {
  overall_score: 6.4,
  summary: { critical: 2, minor: 3, passed: 2 },
  overall_reading: "The foundation is solid, but users will hit friction in two key areas before they reach the core value. Address navigation clarity and information hierarchy first — everything else is refinement.",
  criteria: [
    { name: "Navigation", score: 5, severity: "critical", observation: "Primary navigation lacks clear active states. Users cannot orient themselves within the product.", consequence: "Users will backtrack repeatedly, eroding trust in the product's structure.", fix: "Add persistent active state indicators. Ensure every screen has a clear path back." },
    { name: "Visual Hierarchy", score: 5, severity: "critical", observation: "Multiple elements compete for attention at the same visual weight. No clear primary action.", consequence: "Users will scan without landing. Decision paralysis on key screens.", fix: "Establish one dominant element per screen. Reduce secondary elements to 60% visual weight." },
    { name: "Information Density", score: 7, severity: "minor", observation: "Moderate density overall, with one section significantly more dense than the rest.", consequence: "Cognitive load spikes locally, breaking reading flow.", fix: "Apply consistent spacing tokens. Consider progressive disclosure for the dense section." },
    { name: "Consistency", score: 8, severity: "passed", observation: "Component usage is largely consistent. Minor deviations in button styles across two screens.", consequence: "Low risk, but deviations compound over time.", fix: "Audit button variants and consolidate to three maximum." },
    { name: "Accessibility", score: 6, severity: "minor", observation: "Contrast ratios pass on primary text but fail on placeholder and hint text.", consequence: "Users with low vision will struggle with form inputs.", fix: "Raise hint text colour to minimum 4.5:1 contrast ratio." },
  ],
};

type CriteriaItem = { name: string; score: number; severity: string; observation: string; consequence: string; fix: string };
type Results = { overall_score: number; summary: { critical: number; minor: number; passed: number }; overall_reading: string; criteria: CriteriaItem[] };

// ── Reusable primitives ──────────────────────────────────────────────────────

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(10px)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    }}>
      {children}
    </div>
  );
}

function QuestionLabel({ children }: { children: React.ReactNode }) {
  return <p style={s.questionLabel}>{children}</p>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p style={s.hint}>{children}</p>;
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{ ...s.ghostBtn, borderColor: hover ? "#7b2ff7" : "#3d1f6e", color: hover ? "#c4a8ff" : "#8a7aaa" }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{
        ...s.primaryBtn,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: hover && !disabled ? "0 0 28px #7b2ff7" : "0 0 12px #7b2ff7aa",
      }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

// ── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ image, onFile, onReset }: { image: string | null; onFile: (src: string) => void; onReset: () => void }) {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onFile(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const borderColor = isDragging ? "#7b2ff7" : image ? "#7b2ff760" : "#3d1f6e";
  const bg = isDragging ? "#2a0f4e" : "#160824";

  return (
    <div style={{ width: "100%", maxWidth: 600 }}>
      <div
        style={{ ...s.uploadZone, borderColor, background: bg }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !image && document.getElementById("fileInput")?.click()}
      >
        {image ? (
          <div style={s.previewWrap}>
            <img src={image} alt="Uploaded design" style={s.preview} />
            <button
              style={s.changeBtn}
              onClick={(e) => { e.stopPropagation(); onReset(); }}
            >
              Change
            </button>
          </div>
        ) : (
          <div style={s.uploadPrompt}>
            <div style={s.uploadArrow}>↑</div>
            <p style={s.uploadText}>Drop your screenshot here</p>
            <p style={s.uploadSub}>PNG or JPG · or paste a Figma link below</p>
          </div>
        )}
        <input
          id="fileInput" type="file" accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => processFile(e.target.files?.[0])}
        />
      </div>

      {!image && (
        <input
          type="text"
          placeholder="Or paste a Figma link (coming soon)"
          style={s.figmaInput}
          disabled
        />
      )}
    </div>
  );
}

// ── Context Form ─────────────────────────────────────────────────────────────

interface FormData {
  productType: string | null;
  primaryUsers: string;
  constraints: string;
  criteria: string[];
}

function ContextForm({ onReady }: { onReady: (data: FormData) => void }) {
  const [step, setStep] = useState(1);
  const [productType, setProductType] = useState<string | null>(null);
  const [isOther, setIsOther] = useState(false);
  const [primaryUsers, setPrimaryUsers] = useState("");
  const [constraints, setConstraints] = useState("");
  const [criteria, setCriteria] = useState<Record<string, boolean>>(initialCriteria);

  const toggleCriteria = (id: string) =>
    setCriteria((prev) => ({ ...prev, [id]: !prev[id] }));

  const selectedCriteria = CRITERIA_OPTIONS
    .filter((c) => criteria[c.id])
    .map((c) => c.label);

  const handleGetReading = () => {
    onReady({ productType, primaryUsers, constraints, criteria: selectedCriteria });
  };

  return (
    <div style={s.form}>
      {/* Q1 */}
      <FadeIn delay={0}>
        <div style={s.qBlock}>
          <QuestionLabel>What kind of product is this?</QuestionLabel>
          <div style={s.pillRow}>
            {PRODUCT_TYPES.map((type) => {
              const active = type === "Other" ? isOther : productType === type && !isOther;
              return (
                <button
                  key={type}
                  style={{
                    ...s.pill,
                    background: active ? "#7b2ff7" : "transparent",
                    borderColor: active ? "#7b2ff7" : "#3d1f6e",
                    color: active ? "#fff" : "#8a7aaa",
                  }}
                  onClick={() => {
                    setProductType(type);
                    if (type !== "Other") {
                      setIsOther(false);
                      if (step === 1) setStep(2);
                    } else {
                      setIsOther(true);
                      setProductType("Other");
                    }
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
          {isOther && (
            <input
              autoFocus
              type="text"
              placeholder="Describe your product type"
              style={s.textInput}
              onChange={(e) => {
                setProductType(e.target.value);
                if (step === 1 && e.target.value.trim()) setStep(2);
              }}
            />
          )}
        </div>
      </FadeIn>

      {/* Q2 */}
      {step >= 2 && (
        <FadeIn delay={80}>
          <div style={s.qBlock}>
            <QuestionLabel>Who are the primary users?</QuestionLabel>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Field technicians, small business owners"
              value={primaryUsers}
              onChange={(e) => setPrimaryUsers(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && primaryUsers.trim() && step === 2)
                  setStep(3);
              }}
              style={s.textInput}
            />
            {primaryUsers.trim() && step === 2 && (
              <GhostButton onClick={() => setStep(3)}>Next →</GhostButton>
            )}
          </div>
        </FadeIn>
      )}

      {/* Q3 */}
      {step >= 3 && (
        <FadeIn delay={80}>
          <div style={s.qBlock}>
            <QuestionLabel>Anything I should know before I start?</QuestionLabel>
            <Hint>Stakeholder constraints, technical limits, role complexity — optional</Hint>
            <textarea
              placeholder="e.g. Navigation labels are stakeholder-mandated"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              style={s.textarea}
              rows={3}
            />
            <GhostButton onClick={() => setStep(4)}>
              {constraints.trim() ? "Next →" : "Skip →"}
            </GhostButton>
          </div>
        </FadeIn>
      )}

      {/* Q4 */}
      {step >= 4 && (
        <FadeIn delay={80}>
          <div style={s.qBlock}>
            <QuestionLabel>What should I focus on?</QuestionLabel>
            <Hint>Defaults selected — toggle to adjust</Hint>
            <div style={s.chipGrid}>
              {CRITERIA_OPTIONS.map((c) => {
                const on = criteria[c.id];
                return (
                  <button
                    key={c.id}
                    style={{
                      ...s.chip,
                      background: on ? "#7b2ff720" : "transparent",
                      borderColor: on ? "#7b2ff7" : "#3d1f6e",
                      color: on ? "#c4a8ff" : "#7d67a8",
                    }}
                    onClick={() => toggleCriteria(c.id)}
                  >
                    {on ? "✓ " : ""}{c.label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 8 }}>
              <PrimaryButton
                onClick={handleGetReading}
                disabled={selectedCriteria.length === 0}
              >
                Get the Reading
              </PrimaryButton>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

// ── Results Screen ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const colours: Record<string, { bg: string; border: string; text: string }> = {
    critical: { bg: "#ff4d4d20", border: "#ff4d4d", text: "#ff4d4d" },
    minor: { bg: "#ffaa0020", border: "#ffaa00", text: "#ffaa00" },
    passed: { bg: "#00cc6620", border: "#00cc66", text: "#00cc66" },
  };
  const c = colours[severity];
  return (
    <span style={{
      padding: "3px 10px",
      borderRadius: 100,
      border: `1px solid ${c.border}`,
      background: c.bg,
      color: c.text,
      fontSize: 12,
      fontFamily: "'Lato', sans-serif",
      textTransform: "capitalize",
    }}>
      {severity}
    </span>
  );
}

function CriteriaCard({ item }: { item: CriteriaItem }) {
  const [open, setOpen] = useState(false);
  const [refutation, setRefutation] = useState("");
  const [ignored, setIgnored] = useState(false);
  const [saved, setSaved] = useState(false);

  if (ignored) return (
    <div style={s.cardIgnored}>
      <span style={{ color: "#7d67a8", fontSize: 13 }}>{item.name} — ignored</span>
      <button style={s.undoBtn} onClick={() => setIgnored(false)}>Undo</button>
    </div>
  );

  return (
    <div style={s.card}>
      <div style={s.cardHeader} onClick={() => setOpen((o) => !o)}>
        <div style={s.cardLeft}>
          <span style={s.cardName}>{item.name}</span>
          <span style={s.cardScore}>{item.score}/10</span>
        </div>
        <div style={s.cardRight}>
          <SeverityBadge severity={item.severity} />
          {saved && <span style={s.savedDot}>●</span>}
          <span style={{ color: "#7d67a8", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={s.cardBody}>
          <div style={s.cardSection}>
            <p style={s.cardSectionLabel}>OBSERVATION</p>
            <p style={s.cardSectionText}>{item.observation}</p>
          </div>
          <div style={s.cardSection}>
            <p style={s.cardSectionLabel}>CONSEQUENCE</p>
            <p style={{ ...s.cardSectionText, color: "#c4a8ff", fontStyle: "italic" }}>{item.consequence}</p>
          </div>
          <div style={s.cardSection}>
            <p style={s.cardSectionLabel}>FIX</p>
            <p style={s.cardSectionText}>{item.fix}</p>
          </div>
          <div style={s.refutationWrap}>
            <textarea
              placeholder="Add context or push back on this finding..."
              value={refutation}
              onChange={(e) => setRefutation(e.target.value)}
              style={s.refutationInput}
              rows={2}
            />
          </div>
          <div style={s.cardActions}>
            <button
              style={{ ...s.actionBtn, color: saved ? "#7b2ff7" : "#7d67a8" }}
              onClick={() => setSaved((v) => !v)}
            >
              {saved ? "✓ Saved" : "Save for later"}
            </button>
            <button
              style={{ ...s.actionBtn, color: "#ff4d4d60" }}
              onClick={() => setIgnored(true)}
            >
              Ignore
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsScreen({ image, results }: { image: string | null; results: Results }) {
  const activeCount = results.criteria.filter((c) => c.severity !== "passed").length;

  return (
    <div style={s.resultsPage}>
      <div style={s.leftCol}>
        <div style={s.scoreBlock}>
          <span style={s.bigScore}>{results.overall_score}</span>
          <span style={s.scoreDenom}>/10</span>
        </div>
        <div style={s.summaryRow}>
          <span style={s.summaryItem}>
            <span style={{ color: "#ff4d4d" }}>⬤</span> {results.summary.critical} Critical
          </span>
          <span style={s.summaryItem}>
            <span style={{ color: "#ffaa00" }}>⬤</span> {results.summary.minor} Minor
          </span>
          <span style={s.summaryItem}>
            <span style={{ color: "#00cc66" }}>⬤</span> {results.summary.passed} Passed
          </span>
        </div>
        <p style={s.overallReading}>{results.overall_reading}</p>
        <div style={s.divider} />
        {image && <img src={image} alt="Your design" style={s.resultImage} />}
      </div>

      <div style={s.rightCol}>
        <p style={s.rightColHeader}>
          {activeCount} finding{activeCount !== 1 ? "s" : ""} to review
        </p>
        <div style={s.cardList}>
          {results.criteria.map((item) => (
            <CriteriaCard key={item.name} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  const messages = [
    "Analysing your design...",
    "Looking for patterns...",
    "Preparing your critique...",
    "Almost ready...",
  ];
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={s.loadingScreen}>
      <img src={crystalBall} alt="Crystal ball" style={{ width: 64, height: 64, objectFit: "contain" }} />
      <p style={s.loadingText}>{messages[msgIndex]}</p>
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);

  const handleReset = () => {
    setImage(null);
    setFormData(null);
    setLoading(false);
    setResults(null);
  };

  useEffect(() => {
    if (formData) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setResults(MOCK_RESULTS);
      }, 4000);
    }
  }, [formData]);

  if (loading) {
    return (
      <div style={s.page}>
        <img src={bgImage} style={s.bgImage} alt="" />
        <div style={s.content}>
          <LoadingScreen />
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <div style={s.page}>
        <img src={bgImage} style={s.bgImage} alt="" />
        <div style={s.content}>
          <ResultsScreen image={image} results={results} />
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <img src={bgImage} style={s.bgImage} alt="" />
      <div style={s.content}>
      <header style={s.header}>
        <img src={crystalBall} alt="Crystal ball" style={{ width: 48, height: 48, marginBottom: 12, objectFit: "contain" }} />
        <h1 style={s.title}>Seer</h1>
        <p style={s.subtitle}>Upload your design. Get real critique.</p>
      </header>

      <UploadZone
        image={image}
        onFile={(src) => setImage(src)}
        onReset={handleReset}
      />

      {image && !formData && (
        <FadeIn delay={100}>
          <ContextForm onReady={setFormData} />
        </FadeIn>
      )}
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#1a0a2e",
    position: "relative",
  },
  bgImage: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: 0.3,
    zIndex: 0,
    pointerEvents: "none",
  },
  content: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px 100px",
    minHeight: "100vh",
    fontFamily: "'Lato', sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  title: {
    fontFamily: "'Cormorant Unicase', serif",
    fontSize: 56,
    fontWeight: 500,
    color: "#fff",
    margin: 0,
    letterSpacing: "normal",
  },
  subtitle: {
    color: "#8a7aaa",
    fontSize: 18,
    fontFamily: "'Lato', sans-serif",
    margin: 0,
    letterSpacing: "normal",
  },
  uploadZone: {
    width: "100%",
    maxWidth: 600,
    minHeight: 180,
    border: "2px dashed",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    overflow: "hidden",
    position: "relative",
  },
  previewWrap: {
    width: "100%",
    position: "relative",
  },
  preview: {
    width: "100%",
    maxHeight: 200,
    objectFit: "contain",
    borderRadius: 14,
    display: "block",
  },
  changeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "#1a0a2ecc",
    border: "1px solid #3d1f6e",
    borderRadius: 6,
    color: "#8a7aaa",
    fontSize: 12,
    padding: "4px 10px",
    cursor: "pointer",
  },
  uploadPrompt: {
    textAlign: "center",
    padding: 40,
  },
  uploadArrow: {
    fontSize: 32,
    color: "#7b2ff7",
    marginBottom: 16,
  },
  uploadText: {
    color: "#fff",
    fontSize: 18,
    margin: "0 0 8px",
  },
  uploadSub: {
    color: "#7d67a8",
    fontSize: 13,
    margin: 0,
  },
  figmaInput: {
    width: "100%",
    marginTop: 4,
    padding: "12px 16px",
    background: "#160824",
    border: "1px solid #3d1f6e",
    borderRadius: 8,
    color: "#7d67a8",
    fontSize: 14,
    cursor: "not-allowed",
    boxSizing: "border-box",
  },
  form: {
    width: "100%",
    maxWidth: 600,
    marginTop: 28,
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },
  qBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  questionLabel: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "'Lato', sans-serif",
    fontWeight: 700,
    margin: 0,
  },
  hint: {
    color: "#7d67a8",
    fontSize: 13,
    margin: 0,
  },
  pillRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    padding: "8px 18px",
    borderRadius: 100,
    border: "1px solid",
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "'Lato', sans-serif",
  },
  textInput: {
    width: "100%",
    padding: "12px 16px",
    background: "#160824",
    border: "1px solid #3d1f6e",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "'Lato', sans-serif",
  },
  textarea: {
    width: "100%",
    padding: "12px 16px",
    background: "#160824",
    border: "1px solid #3d1f6e",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    fontFamily: "'Lato', sans-serif",
  },
  chipGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "'Lato', sans-serif",
  },
  ghostBtn: {
    alignSelf: "flex-start",
    padding: "8px 20px",
    background: "transparent",
    border: "1px solid",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Lato', sans-serif",
    transition: "all 0.15s ease",
  },
  primaryBtn: {
    padding: "16px 48px",
    background: "#7b2ff7",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontFamily: "'Cormorant Unicase', serif",
    fontWeight: 500,
    letterSpacing: "normal",
    cursor: "pointer",
    transition: "box-shadow 0.2s ease",
  },
  loadingScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 24,
  },
  loadingText: {
    color: "#8a7aaa",
    fontSize: 18,
    fontFamily: "'Lato', sans-serif",
    margin: 0,
    letterSpacing: "normal",
  },
  resultsPage: {
    width: "100%",
    maxWidth: 1100,
    display: "flex",
    gap: 40,
    marginTop: 40,
    alignItems: "flex-start",
  },
  leftCol: {
    flex: "0 0 60%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    position: "sticky",
    top: 40,
  },
  rightCol: {
    flex: "0 0 40%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  scoreBlock: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
  },
  bigScore: {
    fontFamily: "'Cormorant Unicase', serif",
    fontSize: 72,
    fontWeight: 300,
    color: "#fff",
    lineHeight: 1,
  },
  scoreDenom: {
    fontFamily: "'Cormorant Unicase', serif",
    fontSize: 32,
    color: "#7d67a8",
  },
  summaryRow: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },
  summaryItem: {
    color: "#8a7aaa",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'Lato', sans-serif",
  },
  overallReading: {
    color: "#c4a8ff",
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 1.7,
    margin: 0,
    fontFamily: "'Lato', sans-serif",
  },
  divider: {
    height: 1,
    background: "#3d1f6e",
    width: "100%",
  },
  resultImage: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #3d1f6e",
  },
  rightColHeader: {
    color: "#7d67a8",
    fontSize: 13,
    margin: 0,
    letterSpacing: 0.5,
    fontFamily: "'Lato', sans-serif",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  card: {
    background: "#160824",
    border: "1px solid #3d1f6e",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardIgnored: {
    background: "#160824",
    border: "1px solid #3d1f6e20",
    borderRadius: 12,
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    cursor: "pointer",
  },
  cardLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  cardRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  cardName: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "'Lato', sans-serif",
    fontWeight: 700,
  },
  cardScore: {
    color: "#7d67a8",
    fontSize: 13,
    fontFamily: "'Lato', sans-serif",
  },
  savedDot: {
    color: "#7b2ff7",
    fontSize: 10,
  },
  cardBody: {
    padding: "0 16px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    borderTop: "1px solid #3d1f6e",
  },
  cardSection: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    paddingTop: 14,
  },
  cardSectionLabel: {
    color: "#7d67a8",
    fontSize: 10,
    letterSpacing: 1.5,
    margin: 0,
    fontFamily: "'Lato', sans-serif",
  },
  cardSectionText: {
    color: "#c4a8ff",
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
    fontFamily: "'Lato', sans-serif",
  },
  refutationWrap: {
    borderTop: "1px solid #3d1f6e",
    paddingTop: 12,
  },
  refutationInput: {
    width: "100%",
    padding: "10px 14px",
    background: "#1a0a2e",
    border: "1px solid #3d1f6e",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
    resize: "none",
    fontFamily: "'Lato', sans-serif",
  },
  cardActions: {
    display: "flex",
    gap: 16,
  },
  actionBtn: {
    background: "none",
    border: "none",
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
    fontFamily: "'Lato', sans-serif",
  },
  undoBtn: {
    background: "none",
    border: "none",
    color: "#7b2ff7",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Lato', sans-serif",
  },
};
