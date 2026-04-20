import { useState, useCallback, useEffect } from "react";

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
                      color: on ? "#c4a8ff" : "#5a4a7a",
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
      <div style={{ fontSize: 64 }}>🔮</div>
      <p style={s.loadingText}>{messages[msgIndex]}</p>
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  const [loading, setLoading] = useState(false);

  const handleReset = () => {
    setImage(null);
    setFormData(null);
    setLoading(false);
  };

  useEffect(() => {
    if (formData) {
      setLoading(true);
      // API call goes here in Frame 5
      setTimeout(() => setLoading(false), 4000); // placeholder
    }
  }, [formData]);

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔮</div>
        <h1 style={s.title}>Seer</h1>
        <p style={s.subtitle}>Upload your design. Get a real critique.</p>
      </header>

      <UploadZone
        image={image}
        onFile={(src) => setImage(src)}
        onReset={handleReset}
      />

      {image && !formData && !loading && (
        <FadeIn delay={100}>
          <ContextForm onReady={setFormData} />
        </FadeIn>
      )}

      {loading && <LoadingScreen />}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#1a0a2e",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px 100px",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: 56,
    fontWeight: 300,
    color: "#fff",
    margin: "0 0 12px",
    letterSpacing: 8,
  },
  subtitle: {
    color: "#8a7aaa",
    fontSize: 16,
    margin: 0,
    letterSpacing: 0.5,
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
    color: "#5a4a7a",
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
    color: "#5a4a7a",
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
    fontFamily: "Georgia, serif",
    margin: 0,
  },
  hint: {
    color: "#5a4a7a",
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
    fontFamily: "sans-serif",
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
    fontFamily: "sans-serif",
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
    fontFamily: "sans-serif",
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
    fontFamily: "sans-serif",
  },
  ghostBtn: {
    alignSelf: "flex-start",
    padding: "8px 20px",
    background: "transparent",
    border: "1px solid",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "sans-serif",
    transition: "all 0.15s ease",
  },
  primaryBtn: {
    padding: "16px 48px",
    background: "#7b2ff7",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontFamily: "Georgia, serif",
    letterSpacing: 1,
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
    fontFamily: "Georgia, serif",
    margin: 0,
    letterSpacing: 1,
  },
};
