import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Severity = "critical" | "minor" | "passed";
type CriteriaItem = { name: string; score: number; severity: Severity; observation: string; consequence: string; fix: string };
type Results = { overall_score: number; summary: { critical: number; minor: number; passed: number }; overall_reading: string; criteria: CriteriaItem[] };
type FormData = { productType: string | null; primaryUsers: string; constraints: string; criteria: string[] };
type CritiqueVersion = { id: string; image: string; results: Results; date: string };
type Critique = { id: string; name: string; projectId: string | null; versions: CritiqueVersion[]; formData: FormData };
type Project = { id: string; name: string; productType: string; primaryUsers: string; constraints: string };

// ─── Font shorthand ───────────────────────────────────────────────────────────
const F = {
  body:    "'Chiron GoRound TC', 'Lato', sans-serif",
  serif:   "'Instrument Serif', serif",
  display: "'Climate Crisis', sans-serif",
  mono:    "monospace",
};

// ─── Tokens ───────────────────────────────────────────────────────────────────
// LIGHT — all text colours WCAG AA checked against #f8f5ff bg
// text      #1a0a2e  15.2:1 ✓   textSec  #3d2e62   8.1:1 ✓
// textMuted #5e4d84   5.2:1 ✓   textAcc  #4c18b8   6.1:1 ✓
// critical  #b01c1c   6.4:1 ✓   minor    #8a4800   6.8:1 ✓
// passed    #005c2e   7.1:1 ✓
const LIGHT = {
  bg: "#f8f5ff", bgCard: "#ffffff", bgHover: "#ede8ff", bgOverlay: "rgba(26,10,46,0.4)",
  brand: "#7b2ff7", border: "#ddd5f5", shadow: "0 2px 16px rgba(123,47,247,0.10)",
  text: "#1a0a2e", textSec: "#3d2e62", textMuted: "#5e4d84", textAcc: "#4c18b8",
  critical: "#b01c1c", minor: "#8a4800", passed: "#005c2e", downloadBg: "#ede8ff",
  // primary button: brand bg, white text — 5.9:1 ✓
  btnPrimary: "#7b2ff7", btnPrimaryText: "#ffffff",
  navH: 48,
};

// DARK — text colours checked against #1a0a2e bg
// text      #ffffff  18.3:1 ✓   textSec  #e0d8f8  14.1:1 ✓
// textMuted #c0b0e0   9.4:1 ✓   textAcc  #d4b8ff  10.4:1 ✓
// critical  #ff8080   6.8:1 ✓   minor    #ffc044   9.2:1 ✓
// passed    #4ddd88   8.7:1 ✓
const DARK = {
  bg: "#1a0a2e", bgCard: "#160824", bgHover: "#2a0f4e", bgOverlay: "rgba(0,0,0,0.55)",
  brand: "#9b4fff", border: "#3d1f6e", shadow: "0 2px 16px rgba(0,0,0,0.35)",
  text: "#ffffff", textSec: "#e0d8f8", textMuted: "#c0b0e0", textAcc: "#d4b8ff",
  critical: "#ff8080", minor: "#ffc044", passed: "#4ddd88", downloadBg: "#2a0f4e",
  btnPrimary: "#9b4fff", btnPrimaryText: "#ffffff",
  navH: 48,
};

// ─── Levels ───────────────────────────────────────────────────────────────────
const LEVELS = [
  { emoji: "🕯️", title: "Initiate",          threshold: 10  },
  { emoji: "🌙", title: "Observer",           threshold: 30  },
  { emoji: "🦉", title: "Reader",             threshold: 60  },
  { emoji: "👁️", title: "Architect of Sight", threshold: 100 },
  { emoji: "🪞", title: "Oracle",             threshold: 150 },
  { emoji: "🧙", title: "Seer",               threshold: 250 },
];
function getLevel(shards: number) {
  let lvl = -1;
  for (let i = 0; i < LEVELS.length; i++) { if (shards >= LEVELS[i].threshold) lvl = i; }
  return lvl;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CRITERIA_OPTIONS = [
  { id: "navigation",    label: "Navigation",          default: true  },
  { id: "hierarchy",     label: "Visual Hierarchy",    default: true  },
  { id: "density",       label: "Information Density", default: true  },
  { id: "consistency",   label: "Consistency",         default: true  },
  { id: "accessibility", label: "Accessibility",       default: true  },
  { id: "errors",        label: "Error Handling",      default: false },
  { id: "empty",         label: "Empty States",        default: false },
  { id: "typography",    label: "Typography",          default: false },
  { id: "colour",        label: "Colour & Contrast",   default: false },
  { id: "motion",        label: "Motion & Feedback",   default: false },
];
const PRODUCT_TYPES = ["Web App", "Mobile App", "Dashboard", "Internal Tool", "Other"];
const initCriteria = () => CRITERIA_OPTIONS.reduce<Record<string, boolean>>((a, c) => ({ ...a, [c.id]: c.default }), {});

const MOCK_RESULTS: Results = {
  overall_score: 6.4,
  summary: { critical: 2, minor: 2, passed: 1 },
  overall_reading: "The foundation is solid, but users will hit friction in two key areas before they reach core value. Address navigation clarity and information hierarchy first — everything else is refinement.",
  criteria: [
    { name: "Navigation", score: 5, severity: "critical", observation: "Primary navigation lacks clear active states.", consequence: "Users will backtrack repeatedly, eroding trust in the product's structure.", fix: "Add persistent active state indicators. Ensure every screen has a clear path back." },
    { name: "Visual Hierarchy", score: 5, severity: "critical", observation: "Multiple elements compete at the same visual weight.", consequence: "Decision paralysis on key screens.", fix: "Establish one dominant element per screen. Reduce secondary elements to 60% visual weight." },
    { name: "Information Density", score: 7, severity: "minor", observation: "One section significantly more dense than the rest.", consequence: "Cognitive load spikes locally, breaking reading flow.", fix: "Apply consistent spacing tokens. Consider progressive disclosure." },
    { name: "Consistency", score: 8, severity: "minor", observation: "Minor deviations in button styles across two screens.", consequence: "Deviations compound over time.", fix: "Audit button variants and consolidate to three maximum." },
    { name: "Accessibility", score: 6, severity: "passed", observation: "Contrast ratios pass on primary text. Hint text is borderline.", consequence: "Low risk for most users.", fix: "Raise hint text colour to minimum 4.5:1 contrast ratio." },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const dateStr = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
const persist = (key: string, val: unknown) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── FadeIn ───────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.3s ease,transform 0.3s ease", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {children}
    </div>
  );
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
  @keyframes popIn { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
  @keyframes flyTo { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--tx),var(--ty)) scale(0.2);opacity:0} }
  @keyframes badgeBounce { 0%,100%{transform:scale(1)} 40%{transform:scale(1.3)} 70%{transform:scale(0.9)} }
  @keyframes shardFloat { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-60px);opacity:0} }
  @keyframes overlayIn { 0%{opacity:0} 100%{opacity:1} }
  @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
`;

// ─── Level Unlock Overlay ─────────────────────────────────────────────────────
function LevelUnlockOverlay({ level, onDone }: { level: typeof LEVELS[0]; onDone: () => void }) {
  const [phase, setPhase] = useState<"grow" | "fly">("grow");
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fly"), 2200);
    const t2 = setTimeout(() => onDone(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(26,10,46,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "overlayIn 0.3s ease", backdropFilter: "blur(8px)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 96, animation: phase === "grow" ? "popIn 0.6s ease forwards, pulse 1s ease 0.6s infinite" : "flyTo 0.8s ease forwards", "--tx": "-40vw", "--ty": "-45vh" } as React.CSSProperties}>{level.emoji}</div>
        {phase === "grow" && (
          <div style={{ marginTop: 24, animation: "popIn 0.5s ease 0.4s both" }}>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px", fontFamily: F.body }}>Level unlocked</p>
            <p style={{ color: "#fff", fontSize: 32, fontFamily: F.serif, margin: 0 }}>{level.title}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shard Travel ─────────────────────────────────────────────────────────────
function ShardTravel({ count, onDone, badgeRef }: { count: number; onDone: () => void; badgeRef: React.RefObject<HTMLDivElement> }) {
  const shards = Array.from({ length: Math.min(count, 8) }, (_, i) => i);
  useEffect(() => { const t = setTimeout(onDone, 1200); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
      {shards.map(i => {
        const badge = badgeRef.current?.getBoundingClientRect();
        const tx = badge ? badge.left - window.innerWidth / 2 : 0;
        const ty = badge ? badge.top - window.innerHeight / 2 : -300;
        return <div key={i} style={{ position: "absolute", left: `calc(50% + ${(i - shards.length / 2) * 30}px)`, top: "50%", fontSize: 20, animation: `flyTo 0.9s ${i * 0.08}s ease forwards`, "--tx": `${tx}px`, "--ty": `${ty}px` } as React.CSSProperties}>✦</div>;
      })}
    </div>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ shards, t, badgeRef, bouncing }: { shards: number; t: typeof LIGHT; badgeRef: React.RefObject<HTMLDivElement>; bouncing: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lvlIdx = getLevel(shards);
  const level = lvlIdx >= 0 ? LEVELS[lvlIdx] : null;
  const nextLevel = LEVELS[lvlIdx + 1] || null;
  const progress = nextLevel ? ((shards - (level?.threshold || 0)) / (nextLevel.threshold - (level?.threshold || 0))) * 100 : 100;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div ref={badgeRef} onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: t.bgHover, border: `1px solid ${t.border}`, borderRadius: 20, cursor: "pointer", animation: bouncing ? "badgeBounce 0.5s ease" : "none", userSelect: "none" }}>
        <span style={{ fontSize: 16 }}>{level?.emoji || "🕯️"}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: F.body }}>{shards}</span>
        <span style={{ fontSize: 11, color: t.brand }}>✦</span>
      </div>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 200, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, width: 440, boxShadow: t.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 44 }}>{level?.emoji || "🕯️"}</span>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: t.textMuted, fontFamily: F.body, letterSpacing: 0.8, textTransform: "uppercase" }}>Current level</p>
              <p style={{ margin: 0, fontSize: 20, color: t.text, fontFamily: F.serif }}>{level?.title || "Unranked"}</p>
              <p style={{ margin: 0, fontSize: 12, color: t.textMuted, fontFamily: F.body }}>{shards} ✦ collected</p>
            </div>
          </div>
          {nextLevel && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: t.textMuted, fontFamily: F.body }}>{shards} ✦</span>
                <span style={{ fontSize: 11, color: t.textMuted, fontFamily: F.body }}>{nextLevel.threshold} ✦ → {nextLevel.title}</span>
              </div>
              <div style={{ height: 6, background: t.bgHover, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: t.brand, borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>
            </div>
          )}
          <div style={{ overflowX: "auto", display: "flex", gap: 10, paddingBottom: 4 }}>
            {LEVELS.map((lv, i) => {
              const unlocked = shards >= lv.threshold;
              return (
                <div key={i} style={{ flexShrink: 0, width: 96, height: 96, borderRadius: 14, border: `1.5px solid ${unlocked ? t.brand : t.border}`, background: unlocked ? t.brand + "14" : t.bgHover, opacity: unlocked ? 1 : 0.5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, boxSizing: "border-box" }}>
                  <div style={{ fontSize: 30 }}>{lv.emoji}</div>
                  <p style={{ margin: 0, fontSize: 10, color: unlocked ? t.brand : t.textMuted, fontFamily: F.body, fontWeight: 700, lineHeight: 1.2, textAlign: "center", padding: "0 4px" }}>{lv.title}</p>
                  <p style={{ margin: 0, fontSize: 10, color: unlocked ? t.passed : t.textMuted, fontFamily: F.body }}>{unlocked ? "✓" : `${lv.threshold} ✦`}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  sidebar:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  home:         () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  upload:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  download:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  chevronD:     () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>,
  chevronR:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>,
  back:         () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  folder:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  dots:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  trash:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  edit:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  folderPlus:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
  removeFolder: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
  plus:         () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  settings:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

function PlusBtn({ onClick, title, t }: { onClick: () => void; title: string; t: typeof LIGHT }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: t.downloadBg, border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.textMuted, flexShrink: 0 }}>
      <Icons.plus />
    </button>
  );
}

// ─── Left Panel ───────────────────────────────────────────────────────────────
function LeftPanel({ t, collapsed, onToggleCollapse, projects, critiques, activeCritiqueId, onSelectCritique, onNewCritique, onNewProject, onGoHome, onMoveCritique, onRenameCritique, onDeleteCritique, onDeleteProject, onEditProject, onEditCritique }: {
  t: typeof LIGHT; collapsed: boolean; onToggleCollapse: () => void;
  projects: Project[]; critiques: Critique[];
  activeCritiqueId: string | null;
  onSelectCritique: (id: string) => void;
  onNewCritique: (projectId?: string) => void;
  onNewProject: () => void; onGoHome: () => void;
  onMoveCritique: (cId: string, pId: string | null) => void;
  onRenameCritique: (cId: string, name: string) => void;
  onDeleteCritique: (cId: string) => void;
  onDeleteProject: (pId: string) => void;
  onEditProject: (p: Project) => void;
  onEditCritique: (c: Critique) => void;
}) {
  const [panelView, setPanelView] = useState<string>("root");
  const [dotMenu, setDotMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [projectDotMenu, setProjectDotMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentProject = panelView !== "root" ? projects.find(p => p.id === panelView) : null;
  const standalone = critiques.filter(c => !c.projectId);
  const projectCritiques = currentProject ? critiques.filter(c => c.projectId === currentProject.id) : [];

  useEffect(() => {
    if (!dotMenu && !projectDotMenu) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setDotMenu(null); setMovingId(null); }
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) setProjectDotMenu(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dotMenu, projectDotMenu]);

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !currentProject) return;
    const r = new FileReader();
    r.onload = () => { onNewCritique(currentProject.id); };
    r.readAsDataURL(f);
  };

  const menuItem = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
    <div onClick={action}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", color: danger ? t.critical : t.text, fontSize: 13, fontFamily: F.body, borderBottom: `1px solid ${t.border}` }}
      onMouseEnter={e => e.currentTarget.style.background = t.bgHover}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >{icon}{label}</div>
  );

  const critiqueRow = (c: Critique) => {
    const latest = c.versions[c.versions.length - 1];
    const active = c.id === activeCritiqueId;
    const isInProject = !!c.projectId;
    return (
      <div key={c.id} style={{ position: "relative" }}>
        {renaming === c.id ? (
          <div style={{ padding: "6px 12px" }}>
            <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { onRenameCritique(c.id, renameVal); setRenaming(null); } if (e.key === "Escape") setRenaming(null); }}
              style={{ width: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 12, padding: "4px 8px", outline: "none", boxSizing: "border-box", fontFamily: F.body }} />
          </div>
        ) : (
          <div onClick={() => onSelectCritique(c.id)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer", background: active ? t.bgHover : "transparent" }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
          >
            {latest?.image
              ? <img src={latest.image} style={{ width: 26, height: 26, objectFit: "cover", borderRadius: 4, flexShrink: 0, border: `1px solid ${t.border}` }} alt="" />
              : <div style={{ width: 26, height: 26, borderRadius: 4, background: t.bgHover, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F.body, fontWeight: active ? 700 : 400 }}>{c.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: t.textMuted, fontFamily: F.body }}>
                {latest ? `${latest.results.overall_score} · ${latest.date}` : "No reads yet"}
                {c.versions.length > 1 ? ` · v${c.versions.length}` : ""}
              </p>
            </div>
            <button onClick={e => { e.stopPropagation(); setDotMenu(dotMenu === c.id ? null : c.id); setMovingId(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 2, display: "flex", flexShrink: 0 }}>
              <Icons.dots />
            </button>
          </div>
        )}
        {dotMenu === c.id && (
          <div ref={menuRef} style={{ position: "absolute", right: 8, top: "100%", zIndex: 50, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden", boxShadow: t.shadow, minWidth: 180 }}>
            {movingId === c.id ? (
              <div style={{ padding: 10 }}>
                <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 6px", fontFamily: F.body }}>Move to project</p>
                {projects.length === 0 && <p style={{ fontSize: 12, color: t.textMuted, fontFamily: F.body }}>No projects yet.</p>}
                {projects.map(p => (
                  <div key={p.id} onClick={() => { onMoveCritique(c.id, p.id); setDotMenu(null); setMovingId(null); }}
                    style={{ padding: "6px 8px", fontSize: 12, color: t.text, cursor: "pointer", borderRadius: 4, fontFamily: F.body }}
                    onMouseEnter={e => e.currentTarget.style.background = t.bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >{p.name}</div>
                ))}
                <div onClick={() => setMovingId(null)} style={{ padding: "6px 8px", fontSize: 12, color: t.textMuted, cursor: "pointer", fontFamily: F.body, marginTop: 4 }}>Cancel</div>
              </div>
            ) : (
              <>
                {menuItem(<Icons.edit />, "Edit context", () => { onEditCritique(c); setDotMenu(null); })}
                {!isInProject && menuItem(<Icons.folderPlus />, "Add to project", () => setMovingId(c.id))}
                {isInProject && menuItem(<Icons.removeFolder />, "Remove from project", () => { onMoveCritique(c.id, null); setDotMenu(null); })}
                {menuItem(<Icons.edit />, "Rename", () => { setRenaming(c.id); setRenameVal(c.name); setDotMenu(null); })}
                {menuItem(<Icons.trash />, "Delete", () => { onDeleteCritique(c.id); setDotMenu(null); }, true)}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (collapsed) return (
    <div style={{ width: 48, flexShrink: 0, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, background: t.bgCard, height: "100vh" }}>
      <button onClick={onToggleCollapse} title="Expand" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 4, display: "flex" }}><Icons.sidebar /></button>
      <div style={{ flex: 1 }} />
      <div style={{ padding: "0 0 14px" }}>
        <button title="Export" style={{ background: t.downloadBg, border: "none", borderRadius: 8, cursor: "pointer", color: t.textMuted, padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icons.download />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", background: t.bgCard, height: "100vh", overflow: "hidden" }}>
      <div style={{ height: t.navH, padding: "0 12px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0, boxSizing: "border-box" }}>
        {panelView !== "root" ? (
          <>
            <button onClick={() => setPanelView("root")} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 0, display: "flex" }}><Icons.back /></button>
            <span style={{ color: t.textMuted, display: "flex" }}><Icons.folder /></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontFamily: F.body }}>{currentProject?.name}</span>
            <div style={{ position: "relative" }}>
              <button onClick={() => setProjectDotMenu(projectDotMenu === panelView ? null : panelView)}
                style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 2, display: "flex" }}>
                <Icons.dots />
              </button>
              {projectDotMenu === panelView && currentProject && (
                <div ref={projectMenuRef} style={{ position: "absolute", right: 0, top: "100%", zIndex: 50, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden", boxShadow: t.shadow, minWidth: 160 }}>
                  {menuItem(<Icons.settings />, "Edit project", () => { onEditProject(currentProject); setProjectDotMenu(null); })}
                  {menuItem(<Icons.trash />, "Delete project", () => { onDeleteProject(panelView); setPanelView("root"); setProjectDotMenu(null); }, true)}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button onClick={onGoHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
              <span style={{ fontSize: 15, fontFamily: F.display, color: t.text, letterSpacing: "0.01em" }}>Seer</span>
            </button>
            <button onClick={onToggleCollapse} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 2, display: "flex" }}><Icons.sidebar /></button>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        {panelView === "root" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", marginBottom: 4 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: 1, textTransform: "uppercase", margin: 0, fontFamily: F.body }}>Projects</p>
              {projects.length > 0 && <PlusBtn onClick={onNewProject} title="New project" t={t} />}
            </div>
            {projects.length === 0 ? (
              <div style={{ padding: "10px 12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: t.textMuted, fontFamily: F.body, lineHeight: 1.6 }}>
                  Create a project to organise your critiques and give Seer shared context across every read.
                </p>
                <button onClick={onNewProject} style={{ padding: "8px 16px", background: t.btnPrimary, color: t.btnPrimaryText, border: "none", borderRadius: 100, fontSize: 13, fontFamily: F.body, cursor: "pointer", alignSelf: "flex-start" }}>
                  Create project
                </button>
              </div>
            ) : (
              projects.map(p => (
                <div key={p.id} onClick={() => setPanelView(p.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = t.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: t.textMuted, display: "flex" }}><Icons.folder /></span>
                  <span style={{ fontSize: 13, color: t.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F.body }}>{p.name}</span>
                  <span style={{ color: t.textMuted, display: "flex" }}><Icons.chevronR /></span>
                </div>
              ))
            )}
            <div style={{ height: 1, background: t.border, margin: "8px 12px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", marginBottom: 4 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: 1, textTransform: "uppercase", margin: 0, fontFamily: F.body }}>Critiques</p>
              <PlusBtn onClick={onGoHome} title="New critique" t={t} />
            </div>
            {standalone.length === 0
              ? <p style={{ fontSize: 12, color: t.textMuted, padding: "2px 12px 8px", fontFamily: F.body, lineHeight: 1.6 }}>Your critiques will appear here. Upload a design to get started.</p>
              : standalone.map(critiqueRow)
            }
          </>
        ) : (
          <>
            {currentProject && (
              <div style={{ padding: "8px 12px 10px", borderBottom: `1px solid ${t.border}`, marginBottom: 6 }}>
                <p style={{ margin: "0 0 2px", fontSize: 11, color: t.textMuted, fontFamily: F.body }}>{currentProject.productType} · {currentProject.primaryUsers}</p>
                {currentProject.constraints && <p style={{ margin: 0, fontSize: 11, color: t.textMuted, fontFamily: F.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentProject.constraints}</p>}
              </div>
            )}
            <div style={{ padding: "0 12px 8px" }}>
              <button onClick={() => { if (currentProject) onNewCritique(currentProject.id); }}
                style={{ width: "100%", padding: "7px", background: "none", border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.textSec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: F.body }}>
                <Icons.upload /> Add critique to project
              </button>
            </div>
            {projectCritiques.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", gap: 10, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 12, color: t.textMuted, fontFamily: F.body, lineHeight: 1.6 }}>No critiques yet. Upload a screen to start getting feedback under this project.</p>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleProjectFileChange} />
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding: "8px 18px", background: t.btnPrimary, color: t.btnPrimaryText, border: "none", borderRadius: 100, fontSize: 13, fontFamily: F.body, cursor: "pointer" }}>
                  Upload first screen
                </button>
              </div>
            ) : projectCritiques.map(critiqueRow)}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Version Button ───────────────────────────────────────────────────────────
function VersionButton({ versions, activeIdx, onChange, onUploadNew, t }: {
  versions: CritiqueVersion[]; activeIdx: number; onChange: (i: number) => void;
  onUploadNew: () => void; t: typeof LIGHT;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const hasMultiple = versions.length > 1;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader(); r.onload = () => onUploadNew(); r.readAsDataURL(f);
      }} />
      {hasMultiple ? (
        <button onClick={() => setOpen(o => !o)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: `1px solid ${t.border}`, borderRadius: 8, background: t.bgCard, color: t.textSec, fontSize: 13, cursor: "pointer", fontFamily: F.body }}>
          <Icons.upload /> Version {activeIdx + 1} <span style={{ color: t.textMuted, display: "flex" }}><Icons.chevronD /></span>
        </button>
      ) : (
        <button onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => fileRef.current?.click()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: `1px solid ${t.border}`, borderRadius: 8, background: t.bgCard, color: t.textSec, fontSize: 13, cursor: "pointer", fontFamily: F.body, transition: "all 0.2s", whiteSpace: "nowrap" }}>
          <Icons.upload />{hovered ? "Upload new version" : ""}
        </button>
      )}
      {open && hasMultiple && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 30, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", boxShadow: t.shadow, minWidth: 180 }}>
          {versions.map((v, i) => (
            <div key={v.id} onClick={() => { onChange(i); setOpen(false); }}
              style={{ padding: "9px 14px", fontSize: 13, color: i === activeIdx ? t.brand : t.text, fontFamily: F.body, cursor: "pointer", fontWeight: i === activeIdx ? 700 : 400, background: i === activeIdx ? t.bgHover : "transparent" }}
              onMouseEnter={e => { if (i !== activeIdx) e.currentTarget.style.background = t.bgHover; }}
              onMouseLeave={e => { if (i !== activeIdx) e.currentTarget.style.background = "transparent"; }}
            >Version {i + 1} · {v.date}</div>
          ))}
          <div style={{ height: 1, background: t.border }} />
          <div onClick={() => { fileRef.current?.click(); setOpen(false); }}
            style={{ padding: "9px 14px", fontSize: 13, color: t.textSec, fontFamily: F.body, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            onMouseEnter={e => e.currentTarget.style.background = t.bgHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          ><Icons.upload /> Upload new version</div>
        </div>
      )}
    </div>
  );
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────
function TopNav({ t, dark, onToggleDark, shards, badgeRef, badgeBouncing, view, critique, projects, activeVersionIdx, onVersionChange, onUploadNewVersion, onGoHome }: {
  t: typeof LIGHT; dark: boolean; onToggleDark: () => void;
  shards: number; badgeRef: React.RefObject<HTMLDivElement>; badgeBouncing: boolean;
  view: string; critique: Critique | null; projects: Project[]; activeVersionIdx: number;
  onVersionChange: (i: number) => void; onUploadNewVersion: (src: string) => void;
  onGoHome: () => void;
}) {
  const isResults = view === "results" && critique;
  const isLanding = view === "landing";
  const fileRef = useRef<HTMLInputElement>(null);
  const projectName = critique?.projectId ? projects.find(p => p.id === critique.projectId)?.name : null;

  return (
    <div style={{ height: t.navH, borderBottom: isLanding ? "none" : `1px solid ${t.border}`, display: "flex", alignItems: "center", background: isLanding ? "transparent" : t.bgCard, flexShrink: 0, boxSizing: "border-box", padding: "0 16px", position: isLanding ? "absolute" : "relative", top: 0, left: 0, right: 0, zIndex: isLanding ? 50 : undefined }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader(); r.onload = ev => onUploadNewVersion(ev.target?.result as string); r.readAsDataURL(f);
      }} />
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {isResults && (
          <button onClick={onGoHome} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 4, display: "flex", borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.background = t.bgHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          ><Icons.home /></button>
        )}
      </div>
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
        {isResults && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: F.body }}>{critique.name}</span>
            {projectName && (
              <>
                <span style={{ fontSize: 13, color: t.border, fontFamily: F.body }}>/</span>
                <span style={{ fontSize: 13, color: t.textMuted, fontFamily: F.body }}>{projectName}</span>
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
        {isResults && <VersionButton versions={critique.versions} activeIdx={activeVersionIdx} onChange={onVersionChange} onUploadNew={() => fileRef.current?.click()} t={t} />}
        {!isResults && (
          <button onClick={onToggleDark} style={{ background: isLanding ? t.bgHover : "none", border: `1px solid ${t.border}`, borderRadius: 16, padding: "4px 12px", cursor: "pointer", color: t.textMuted, fontSize: 12, fontFamily: F.body }}>
            {dark ? "☀ Light" : "◐ Dark"}
          </button>
        )}
        <ScoreBadge shards={shards} t={t} badgeRef={badgeRef} bouncing={badgeBouncing} />
      </div>
    </div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ image, onFile, onReset, t, glass }: { image: string | null; onFile: (src: string) => void; onReset: () => void; t: typeof LIGHT; glass?: boolean }) {
  const [drag, setDrag] = useState(false);
  const [tab, setTab] = useState<"screenshot" | "figma">("screenshot");
  const [figmaUrl, setFigmaUrl] = useState("");

  const process = useCallback((file?: File | null) => {
    if (!file?.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => onFile(e.target?.result as string);
    r.readAsDataURL(file);
  }, [onFile]);

  const cardBg = glass ? "rgba(255,255,255,0.35)" : t.bgCard;
  const tabActiveBg = glass ? "rgba(255,255,255,0.75)" : t.bgCard;
  const tabBg = glass ? "rgba(255,255,255,0.25)" : t.bgHover;
  const dropBg = drag ? (glass ? "rgba(196,160,232,0.15)" : t.bgHover) : cardBg;
  // The glass card is always a light frosted surface regardless of theme,
  // so its text must stay dark for contrast even in dark mode.
  const glassText = glass ? "#2d1060" : t.text;
  const glassTextMuted = glass ? "#6b4f96" : t.textMuted;

  return (
    <div style={{ width: "100%" }}>
      {!image && (
        <div style={{ display: "flex", gap: 0, marginBottom: 12, background: tabBg, borderRadius: 10, padding: 3, width: "100%" }}>
          {(["screenshot", "figma"] as const).map(tab_ => (
            <button key={tab_} onClick={() => setTab(tab_)}
              style={{ flex: 1, padding: "6px 16px", borderRadius: 8, border: "none", background: tab === tab_ ? tabActiveBg : "transparent", color: tab === tab_ ? glassText : glassTextMuted, fontSize: 13, cursor: "pointer", fontFamily: F.body, fontWeight: tab === tab_ ? 600 : 400, transition: "all 0.15s" }}>
              {tab_ === "screenshot" ? "Screenshot" : "Figma link"}
            </button>
          ))}
        </div>
      )}
      {tab === "screenshot" || image ? (
        <div style={{ width: "100%", minHeight: 160, border: `2px dashed ${drag ? t.brand : image ? t.brand + "60" : glass ? "rgba(196,160,232,0.5)" : t.border}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: image ? "default" : "pointer", background: dropBg, transition: "all 0.2s", overflow: "hidden", position: "relative" }}
          onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files[0]); }}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onClick={() => !image && document.getElementById("seer-fi")?.click()}
        >
          {image ? (
            <>
              <img src={image} style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 12, display: "block" }} alt="" />
              <button onClick={e => { e.stopPropagation(); onReset(); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(26,10,46,0.75)", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, padding: "3px 9px", cursor: "pointer" }}>✕</button>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 28, color: t.brand, marginBottom: 10 }}>↑</div>
              <p style={{ color: glassText, fontSize: 16, margin: "0 0 6px", fontFamily: F.body }}>Drop your screenshot here</p>
              <p style={{ color: glassTextMuted, fontSize: 13, margin: 0, fontFamily: F.body }}>PNG or JPG</p>
            </div>
          )}
          <input id="seer-fi" type="file" accept="image/*" style={{ display: "none" }} onChange={e => process(e.target.files?.[0])} />
        </div>
      ) : (
        <div style={{ width: "100%", padding: 20, border: `1px solid ${glass ? "rgba(196,160,232,0.4)" : t.border}`, borderRadius: 14, background: glass ? "rgba(255,255,255,0.3)" : t.bgCard, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="text" placeholder="https://www.figma.com/file/..." value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)}
              style={{ flex: 1, padding: "10px 14px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14, outline: "none", fontFamily: F.body }} />
            <button onClick={() => navigator.clipboard.readText().then(setFigmaUrl)}
              style={{ padding: "10px 16px", background: t.bgHover, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textSec, fontSize: 13, cursor: "pointer", fontFamily: F.body, whiteSpace: "nowrap" }}>Paste</button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: glassTextMuted, fontFamily: F.body }}>Paste your frame link — make sure it's set to "anyone with link can view" in Figma's share settings.</p>
          <button disabled={!figmaUrl.includes("figma.com")}
            style={{ padding: "10px 20px", background: figmaUrl.includes("figma.com") ? t.btnPrimary : t.bgHover, color: figmaUrl.includes("figma.com") ? t.btnPrimaryText : t.textMuted, border: "none", borderRadius: 100, fontSize: 13, cursor: figmaUrl.includes("figma.com") ? "pointer" : "not-allowed", fontFamily: F.body }}>
            Import frame
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Context Form ─────────────────────────────────────────────────────────────
function ContextForm({ onReady, t, projectCtx, prefill }: { onReady: (d: FormData) => void; t: typeof LIGHT; projectCtx?: Project; prefill?: FormData }) {
  const [step, setStep] = useState(projectCtx ? 2 : 1);
  const [productType, setProductType] = useState<string | null>(prefill?.productType || projectCtx?.productType || null);
  const [other, setOther] = useState(false);
  const [users, setUsers] = useState(prefill?.primaryUsers || "");
  const [constraints, setConstraints] = useState(prefill?.constraints || "");
  const [criteria, setCriteria] = useState(() => {
    if (prefill?.criteria?.length) {
      const m = initCriteria();
      Object.keys(m).forEach(k => { m[k] = false; });
      prefill.criteria.forEach(label => {
        const opt = CRITERIA_OPTIONS.find(o => o.label === label);
        if (opt) m[opt.id] = true;
      });
      return m;
    }
    return initCriteria();
  });

  // If prefill provided, start at step 4
  useEffect(() => { if (prefill) setStep(4); }, []);

  const selected = CRITERIA_OPTIONS.filter(c => criteria[c.id]).map(c => c.label);
  const inp: React.CSSProperties = { width: "100%", padding: "11px 14px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: F.body };
  const ghost: React.CSSProperties = { alignSelf: "flex-start", padding: "7px 18px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 100, fontSize: 13, cursor: "pointer", color: t.textSec, fontFamily: F.body };
  const lbl: React.CSSProperties = { color: t.text, fontSize: 15, fontFamily: F.body, fontWeight: 700, margin: 0 };
  const hint: React.CSSProperties = { color: t.textMuted, fontSize: 12, margin: 0, fontFamily: F.body };

  return (
    <div style={{ width: "100%", maxWidth: 540, marginTop: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      {!projectCtx && (
        <FadeIn>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={lbl}>What kind of product is this?</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRODUCT_TYPES.map(type => {
                const active = type === "Other" ? other : productType === type && !other;
                return <button key={type} onClick={() => { setProductType(type); if (type !== "Other") { setOther(false); if (step === 1) setStep(2); } else setOther(true); }}
                  style={{ padding: "7px 18px", borderRadius: 100, border: `1px solid ${active ? t.brand : t.border}`, background: active ? t.brand : "transparent", color: active ? t.btnPrimaryText : t.textSec, fontSize: 13, cursor: "pointer", fontFamily: F.body }}>{type}</button>;
              })}
            </div>
            {other && <input autoFocus type="text" placeholder="Describe your product type" style={inp} onChange={e => { setProductType(e.target.value); if (step === 1 && e.target.value.trim()) setStep(2); }} />}
          </div>
        </FadeIn>
      )}
      {step >= 2 && (
        <FadeIn delay={projectCtx ? 0 : 80}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={lbl}>Who are the primary users?</p>
            {projectCtx && <p style={hint}>Project default: {projectCtx.primaryUsers} — add more context if needed</p>}
            <input autoFocus type="text" placeholder={projectCtx ? "Add more context for this critique..." : "e.g. Field technicians, small business owners"} value={users} onChange={e => setUsers(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (users.trim() || projectCtx) && step === 2) setStep(3); }} style={inp} />
            {(users.trim() || projectCtx) && step === 2 && <button onClick={() => setStep(3)} style={ghost}>Next →</button>}
          </div>
        </FadeIn>
      )}
      {step >= 3 && (
        <FadeIn delay={80}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={lbl}>Anything I should know?</p>
            <p style={hint}>Stakeholder constraints, technical limits — optional</p>
            <textarea placeholder="e.g. Navigation labels are stakeholder-mandated" value={constraints} onChange={e => setConstraints(e.target.value)} style={{ ...inp, resize: "vertical" }} rows={3} />
            <button onClick={() => setStep(4)} style={ghost}>{constraints.trim() ? "Next →" : "Skip →"}</button>
          </div>
        </FadeIn>
      )}
      {step >= 4 && (
        <FadeIn delay={80}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={lbl}>What should I focus on?</p>
            <p style={hint}>Defaults selected — toggle to adjust</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CRITERIA_OPTIONS.map(c => {
                const on = criteria[c.id];
                return <button key={c.id} onClick={() => setCriteria(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                  style={{ padding: "5px 14px", borderRadius: 100, border: `1px solid ${on ? t.brand : t.border}`, background: on ? t.brand + "18" : "transparent", color: on ? t.textAcc : t.textMuted, fontSize: 13, cursor: "pointer", fontFamily: F.body }}>{on ? "✓ " : ""}{c.label}</button>;
              })}
            </div>
            <button disabled={selected.length === 0}
              onClick={() => onReady({ productType: projectCtx?.productType || productType, primaryUsers: users || projectCtx?.primaryUsers || "", constraints: [projectCtx?.constraints, constraints].filter(Boolean).join(". "), criteria: selected })}
              style={{ marginTop: 8, padding: "14px 48px", background: t.btnPrimary, color: t.btnPrimaryText, border: "none", borderRadius: 100, fontSize: 17, fontFamily: F.body, fontWeight: 400, cursor: selected.length === 0 ? "not-allowed" : "pointer", opacity: selected.length === 0 ? 0.4 : 1, boxShadow: `0 4px 20px ${t.brand}44`, alignSelf: "center", letterSpacing: "0.01em" }}>
              Get the Reading
            </button>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

// ─── Edit Context Modal ────────────────────────────────────────────────────────
function EditContextModal({ t, title, prefill, projectCtx, onSave, onCancel }: {
  t: typeof LIGHT; title: string; prefill: FormData; projectCtx?: Project;
  onSave: (fd: FormData) => void; onCancel: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: t.bgOverlay, backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: t.bgCard, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: t.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 18, color: t.text, fontFamily: F.serif }}>{title}</p>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 20 }}>✕</button>
        </div>
        <ContextForm onReady={fd => { onSave(fd); onCancel(); }} t={t} projectCtx={projectCtx} prefill={prefill} />
      </div>
    </div>
  );
}

// ─── New Project Flow ─────────────────────────────────────────────────────────
function NewProjectFlow({ t, onSave, onCancel, prefill }: { t: typeof LIGHT; onSave: (p: Project, image?: string) => void; onCancel: () => void; prefill?: Project }) {
  const [step, setStep] = useState(prefill ? 4 : 1);
  const [name, setName] = useState(prefill?.name || "");
  const [productType, setProductType] = useState<string | null>(prefill?.productType || null);
  const [other, setOther] = useState(false);
  const [users, setUsers] = useState(prefill?.primaryUsers || "");
  const [constraints, setConstraints] = useState(prefill?.constraints || "");
  const [firstImage, setFirstImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inp: React.CSSProperties = { width: "100%", padding: "11px 14px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: F.body };
  const ghost: React.CSSProperties = { alignSelf: "flex-start", padding: "7px 18px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 100, fontSize: 13, cursor: "pointer", color: t.textSec, fontFamily: F.body };
  const lbl: React.CSSProperties = { color: t.text, fontSize: 15, fontFamily: F.body, fontWeight: 700, margin: 0 };

  const processFile = (file?: File | null) => {
    if (!file?.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => setFirstImage(e.target?.result as string);
    r.readAsDataURL(file);
  };

  return (
    <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={{ color: t.text, fontSize: 24, fontFamily: F.serif, margin: "0 0 4px" }}>{prefill ? "Edit Project" : "New Project"}</p>
        <p style={{ color: t.textMuted, fontSize: 14, margin: 0, fontFamily: F.body }}>Projects group related critiques with shared context.</p>
      </div>
      <FadeIn>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={lbl}>Project name</p>
          <input autoFocus type="text" placeholder="e.g. Vantage Dashboard" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && name.trim()) setStep(2); }} style={inp} />
          {name.trim() && step === 1 && <button onClick={() => setStep(2)} style={ghost}>Next →</button>}
        </div>
      </FadeIn>
      {step >= 2 && (
        <FadeIn delay={80}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={lbl}>What kind of product?</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRODUCT_TYPES.map(type => {
                const active = type === "Other" ? other : productType === type && !other;
                return <button key={type} onClick={() => { setProductType(type); if (type !== "Other") { setOther(false); if (step === 2) setStep(3); } else setOther(true); }}
                  style={{ padding: "7px 18px", borderRadius: 100, border: `1px solid ${active ? t.brand : t.border}`, background: active ? t.brand : "transparent", color: active ? t.btnPrimaryText : t.textSec, fontSize: 13, cursor: "pointer", fontFamily: F.body }}>{type}</button>;
              })}
            </div>
            {other && <input autoFocus type="text" placeholder="Describe the product" style={inp} onChange={e => { setProductType(e.target.value); if (step === 2 && e.target.value.trim()) setStep(3); }} />}
          </div>
        </FadeIn>
      )}
      {step >= 3 && (
        <FadeIn delay={80}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={lbl}>Primary users</p>
            <input autoFocus type="text" placeholder="e.g. Operations teams, designers" value={users} onChange={e => setUsers(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && users.trim()) setStep(4); }} style={inp} />
            {users.trim() && step === 3 && <button onClick={() => setStep(4)} style={ghost}>Next →</button>}
          </div>
        </FadeIn>
      )}
      {step >= 4 && (
        <FadeIn delay={80}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={lbl}>Known constraints</p>
            <p style={{ color: t.textMuted, fontSize: 12, margin: 0, fontFamily: F.body }}>Optional — applies to all critiques in this project</p>
            <textarea placeholder="e.g. Nav labels are stakeholder-mandated" value={constraints} onChange={e => setConstraints(e.target.value)} style={{ ...inp, resize: "vertical" }} rows={3} />
            {!prefill && <button onClick={() => setStep(5)} style={ghost}>{constraints.trim() ? "Next →" : "Skip →"}</button>}
            {prefill && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onCancel} style={{ padding: "10px 22px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 100, fontSize: 14, cursor: "pointer", color: t.textSec, fontFamily: F.body }}>Cancel</button>
                <button onClick={() => onSave({ id: prefill.id, name, productType: productType || "Web App", primaryUsers: users, constraints })}
                  style={{ padding: "10px 28px", background: t.btnPrimary, color: t.btnPrimaryText, border: "none", borderRadius: 100, fontSize: 14, fontFamily: F.body, cursor: "pointer", boxShadow: `0 4px 20px ${t.brand}44` }}>
                  Save changes
                </button>
              </div>
            )}
          </div>
        </FadeIn>
      )}
      {step >= 5 && !prefill && (
        <FadeIn delay={80}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={lbl}>Upload the first screen under this project</p>
            <p style={{ color: t.textMuted, fontSize: 12, margin: 0, fontFamily: F.body }}>Optional — you can add screens later too</p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files?.[0])} />
            {firstImage ? (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${t.border}` }}>
                <img src={firstImage} style={{ width: "100%", maxHeight: 160, objectFit: "contain", display: "block" }} alt="" />
                <button onClick={() => setFirstImage(null)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(26,10,46,0.75)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, padding: "2px 8px", cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${t.border}`, borderRadius: 10, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: t.bgHover }}
                onMouseEnter={e => e.currentTarget.style.borderColor = t.brand}
                onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
              >
                <div style={{ fontSize: 22, color: t.brand, marginBottom: 6 }}>↑</div>
                <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: F.body }}>Click to upload a screen</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={onCancel} style={{ padding: "10px 22px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 100, fontSize: 14, cursor: "pointer", color: t.textSec, fontFamily: F.body }}>Cancel</button>
              <button onClick={() => onSave({ id: uid(), name, productType: productType || "Web App", primaryUsers: users, constraints }, firstImage || undefined)}
                style={{ padding: "10px 28px", background: t.btnPrimary, color: t.btnPrimaryText, border: "none", borderRadius: 100, fontSize: 14, fontFamily: F.body, cursor: "pointer", boxShadow: `0 4px 20px ${t.brand}44` }}>
                {firstImage ? "Save and get reading" : "Save project"}
              </button>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

// ─── Criteria Card ────────────────────────────────────────────────────────────
function CriteriaCard({ item, onScoreChange, onResolve, t }: { item: CriteriaItem; onScoreChange: (delta: number) => void; onResolve: () => void; t: typeof LIGHT }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState("");
  const [reconsidering, setReconsidering] = useState(false);
  const [reconsidered, setReconsidered] = useState(false);
  const [reconsideredSeverity, setReconsideredSeverity] = useState<Severity>(item.severity);
  const [resolved, setResolved] = useState(false);
  const [ignored, setIgnored] = useState(false);
  const [saved, setSaved] = useState(false);

  const sevColor = { critical: t.critical, minor: t.minor, passed: t.passed }[reconsidered ? reconsideredSeverity : item.severity] || t.passed;
  const displaySeverity = reconsidered ? reconsideredSeverity : item.severity;

  const handleSubmitContext = () => {
    if (!context.trim()) return;
    setReconsidering(true);
    setTimeout(() => {
      setReconsidering(false);
      setReconsidered(true);
      const order: Severity[] = ["critical", "minor", "passed"];
      const idx = order.indexOf(item.severity);
      setReconsideredSeverity(order[Math.min(idx + 1, 2)]);
      setContext("");
    }, 1800);
  };

  if (ignored) return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}30`, borderRadius: 10, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: t.textMuted, fontSize: 13, fontFamily: F.body }}>{item.name} — ignored</span>
      <button style={{ background: "none", border: "none", color: t.brand, fontSize: 13, cursor: "pointer", fontFamily: F.body }} onClick={() => { setIgnored(false); onScoreChange(+1); }}>Undo</button>
    </div>
  );

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${resolved ? t.passed : t.border}`, borderRadius: 10, transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: t.text, fontSize: 13, fontFamily: F.body, fontWeight: 600 }}>{item.name}</span>
          <span style={{ color: t.textMuted, fontSize: 12, fontFamily: F.body }}>{item.score}/10</span>
          {resolved && <span style={{ color: t.passed, fontSize: 11 }}>✓</span>}
          {reconsidered && <span style={{ color: t.passed, fontSize: 10, fontFamily: F.body, background: t.passed + "18", padding: "1px 6px", borderRadius: 4 }}>reconsidered</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <span style={{ padding: "2px 8px", borderRadius: 100, border: `1px solid ${sevColor}`, background: sevColor + "18", color: sevColor, fontSize: 11, fontFamily: F.body, textTransform: "capitalize" }}>{displaySeverity}</span>
          {saved && <span style={{ color: t.brand, fontSize: 9 }}>●</span>}
          <span style={{ color: t.textMuted, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
          {[{ label: "OBSERVATION", text: item.observation, italic: false }, { label: "CONSEQUENCE", text: item.consequence, italic: true }, { label: "FIX", text: item.fix, italic: false }].map(({ label, text, italic }) => (
            <div key={label} style={{ paddingTop: 12 }}>
              <p style={{ color: t.textMuted, fontSize: 10, letterSpacing: 1.5, margin: "0 0 4px", fontFamily: F.body }}>{label}</p>
              <p style={{ color: t.textAcc, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: F.body, fontStyle: italic ? "italic" : "normal" }}>{text}</p>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
            <p style={{ color: t.textMuted, fontSize: 10, letterSpacing: 1.5, margin: "0 0 6px", fontFamily: F.body }}>ADD CONTEXT</p>
            {reconsidering ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
                <div style={{ width: 14, height: 14, border: `2px solid ${t.brand}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ color: t.textMuted, fontSize: 13, fontFamily: F.body }}>Seer is reconsidering...</span>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <textarea placeholder="Share what Seer might have missed — constraints, intent, or trade-offs..." value={context} onChange={e => setContext(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitContext(); } }}
                  style={{ width: "100%", padding: "9px 12px 36px 12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 13, boxSizing: "border-box", outline: "none", resize: "none", fontFamily: F.body }} rows={2} />
                {context.trim() && (
                  <button onClick={handleSubmitContext} style={{ position: "absolute", right: 7, bottom: 7, background: t.btnPrimary, border: "none", borderRadius: 100, color: t.btnPrimaryText, fontSize: 12, padding: "4px 12px", cursor: "pointer", fontFamily: F.body }}>Submit</button>
                )}
              </div>
            )}
            {reconsidered && !reconsidering && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: t.passed, fontFamily: F.body }}>✓ Seer has taken your context on board · severity updated</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <button style={{ background: "none", border: "none", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: F.body, color: resolved ? t.passed : t.textMuted }} onClick={() => { setResolved(v => !v); if (!resolved) onResolve(); }}>{resolved ? "✓ Resolved" : "Mark resolved"}</button>
            <button style={{ background: "none", border: "none", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: F.body, color: saved ? t.brand : t.textMuted }} onClick={() => setSaved(v => !v)}>{saved ? "✓ Saved" : "Save for later"}</button>
            <button style={{ background: "none", border: "none", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: F.body, color: t.critical }} onClick={() => { setIgnored(true); onScoreChange(-1); }}>Ignore</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Image Selector ───────────────────────────────────────────────────────────
type Rect = { x: number; y: number; w: number; h: number };

function ImageSelector({ image, t, onCritiqueElement, onCloseElement, onRegisterClear }: {
  image: string; t: typeof LIGHT;
  onCritiqueElement?: () => void;
  onCloseElement?: () => void;
  onRegisterClear?: (fn: () => void) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [confirmed, setConfirmed] = useState<Rect | null>(null);
  const [critiqued, setCritiqued] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (onRegisterClear) onRegisterClear(() => { setConfirmed(null); setRect(null); setCritiqued(false); });
  }, []);

  const toRelative = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const b = el.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (clientX - b.left) / b.width)), y: Math.max(0, Math.min(1, (clientY - b.top) / b.height)) };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const pos = toRelative(e.clientX, e.clientY);
    setStart(pos); setRect(null); setConfirmed(null); setCritiqued(false); setDragging(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !start) return;
    const pos = toRelative(e.clientX, e.clientY);
    setRect({ x: Math.min(start.x, pos.x), y: Math.min(start.y, pos.y), w: Math.abs(pos.x - start.x), h: Math.abs(pos.y - start.y) });
  };
  const onMouseUp = () => {
    if (!dragging) return;
    setDragging(false); setStart(null);
    if (rect && rect.w > 0.02 && rect.h > 0.02) { setConfirmed(rect); } else { setRect(null); }
  };

  const displayRect = rect || confirmed;
  return (
    <div ref={containerRef}
      style={{ position: "relative", width: "100%", borderRadius: 12, border: `1px solid ${t.border}`, cursor: hovering ? "crosshair" : "default", userSelect: "none" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); if (dragging) { setDragging(false); setStart(null); } }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
    >
      <img src={image} alt="Design" style={{ width: "100%", display: "block", borderRadius: 12 }} draggable={false} />
      {hovering && !dragging && !confirmed && <div style={{ position: "absolute", inset: 0, background: "rgba(123,47,247,0.04)", borderRadius: 12, pointerEvents: "none" }} />}
      {displayRect && (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.38)", pointerEvents: "none", borderRadius: 12 }} />
          <div style={{ position: "absolute", left: `${displayRect.x * 100}%`, top: `${displayRect.y * 100}%`, width: `${displayRect.w * 100}%`, height: `${displayRect.h * 100}%`, boxShadow: `0 0 0 9999px rgba(0,0,0,0.38)`, border: `2px solid ${t.brand}`, borderRadius: 4, pointerEvents: "none", background: "transparent" }} />
          {confirmed && [[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy], i) => (
            <div key={i} style={{ position: "absolute", left: `calc(${(displayRect!.x + cx * displayRect!.w) * 100}% - 4px)`, top: `calc(${(displayRect!.y + cy * displayRect!.h) * 100}% - 4px)`, width: 8, height: 8, background: t.brand, borderRadius: 2, pointerEvents: "none" }} />
          ))}
          {confirmed && (
            <button onClick={e => { e.stopPropagation(); setConfirmed(null); setRect(null); setCritiqued(false); if (onCloseElement) onCloseElement(); }}
              style={{ position: "absolute", left: `calc(${displayRect!.x * 100 + displayRect!.w * 100}% - 12px)`, top: `calc(${displayRect!.y * 100}% - 12px)`, width: 24, height: 24, background: t.brand, border: "none", borderRadius: "50%", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, lineHeight: 1 }}>✕</button>
          )}
          {confirmed && !critiqued && (
            <div style={{ position: "absolute", left: `${displayRect!.x * 100}%`, top: `calc(${(displayRect!.y + displayRect!.h) * 100}% + 8px)`, zIndex: 20, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 10px", display: "flex", gap: 8, alignItems: "center", boxShadow: t.shadow, whiteSpace: "nowrap" }}>
              <button onClick={e => { e.stopPropagation(); setCritiqued(true); if (onCritiqueElement) onCritiqueElement(); }}
                style={{ background: t.btnPrimary, border: "none", borderRadius: 100, color: t.btnPrimaryText, fontSize: 12, padding: "4px 14px", cursor: "pointer", fontFamily: F.body }}>
                Critique this element
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
function ResultsScreen({ critique, activeVersionIdx, onVersionChange, onNewVersion, t, onShardsEarned }: {
  critique: Critique; activeVersionIdx: number; onVersionChange: (i: number) => void;
  onNewVersion: (src: string) => void; t: typeof LIGHT; onShardsEarned: (n: number) => void;
}) {
  const version = critique.versions[activeVersionIdx];
  const [score, setScore] = useState(version.results.overall_score);
  const [shardAnim, setShardAnim] = useState(false);
  const [elementMode, setElementMode] = useState(false);
  const [elementCritique, setElementCritique] = useState<string | null>(null);
  const [elementLoading, setElementLoading] = useState(false);
  const clearSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => setScore(version.results.overall_score), [version]);
  const activeCount = version.results.criteria.filter(c => c.severity !== "passed").length;

  const handleResolve = () => { onShardsEarned(0.5); setShardAnim(true); setTimeout(() => setShardAnim(false), 1200); };

  const handleCritiqueElement = () => {
    setElementMode(true); setElementCritique(null); setElementLoading(true);
    setTimeout(() => { setElementLoading(false); setElementCritique("The selected element has unclear affordance. Users are unlikely to recognise it as interactive without an explicit hover state or label. Consider adding a visible boundary or descriptive microcopy to set expectations before the user acts."); }, 2000);
  };

  const handleCloseElementMode = () => {
    setElementMode(false); setElementCritique(null); setElementLoading(false);
    if (clearSelectionRef.current) clearSelectionRef.current();
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px 80px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: F.serif, fontSize: 72, fontWeight: 400, color: t.text, lineHeight: 1 }}>{score.toFixed(1)}</span>
          <span style={{ fontFamily: F.serif, fontSize: 28, color: t.textMuted }}>/10</span>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
          {[{ c: t.critical, n: version.results.summary.critical, l: "Critical" }, { c: t.minor, n: version.results.summary.minor, l: "Minor" }, { c: t.passed, n: version.results.summary.passed, l: "Passed" }].map(({ c, n, l }) => (
            <span key={l} style={{ color: t.textSec, fontSize: 13, display: "flex", alignItems: "center", gap: 5, fontFamily: F.body }}><span style={{ color: c }}>⬤</span>{n} {l}</span>
          ))}
        </div>
        <p style={{ color: t.textAcc, fontSize: 14, fontStyle: "italic", lineHeight: 1.7, margin: "16px 0 20px", fontFamily: F.body }}>{version.results.overall_reading}</p>
        <div style={{ height: 1, background: t.border, marginBottom: 20 }} />
        <ImageSelector image={version.image} t={t} onCritiqueElement={handleCritiqueElement} onCloseElement={handleCloseElementMode} onRegisterClear={fn => { clearSelectionRef.current = fn; }} />
        {shardAnim && <div style={{ position: "fixed", bottom: 80, left: "30%", fontSize: 24, animation: "shardFloat 1s ease forwards", pointerEvents: "none", zIndex: 100 }}>+0.5 ✦</div>}
      </div>
      <div style={{ width: 360, flexShrink: 0, borderLeft: `1px solid ${t.border}`, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {elementMode ? (
          <>
            <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${t.border}`, flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: F.body }}>Element Critique</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: t.textMuted, fontFamily: F.body }}>Selected area only</p>
              </div>
              <button onClick={handleCloseElementMode} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 18, padding: 2, flexShrink: 0, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "16px 14px" }}>
              {elementLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 }}>
                  <div style={{ width: 20, height: 20, border: `2px solid ${t.brand}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <p style={{ color: t.textMuted, fontSize: 13, fontFamily: F.body, margin: 0 }}>Analysing element...</p>
                </div>
              ) : elementCritique ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: t.bgHover, borderRadius: 10, padding: 14 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 10, letterSpacing: 1.5, color: t.textMuted, fontFamily: F.body }}>ELEMENT FEEDBACK</p>
                    <p style={{ margin: 0, fontSize: 13, color: t.textAcc, lineHeight: 1.7, fontFamily: F.body }}>{elementCritique}</p>
                  </div>
                  <button onClick={handleCloseElementMode} style={{ padding: "8px 0", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 100, fontSize: 13, color: t.textSec, cursor: "pointer", fontFamily: F.body }}>← Back to full critique</button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: "20px 16px 12px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: F.body }}>Findings</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: t.textMuted, fontFamily: F.body }}>{activeCount} finding{activeCount !== 1 ? "s" : ""} to review</p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {version.results.criteria.map(item => (
                <CriteriaCard key={item.name} item={item} t={t}
                  onScoreChange={d => setScore(s => Math.round(Math.max(0, Math.min(10, s + d * 0.4)) * 10) / 10)}
                  onResolve={handleResolve}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function LoadingScreen({ t }: { t: typeof LIGHT }) {
  const msgs = ["Analysing your design...", "Looking for patterns...", "Preparing your critique...", "Almost ready..."];
  const [i, setI] = useState(0);
  useEffect(() => { const timer = setInterval(() => setI(n => (n + 1) % msgs.length), 2000); return () => clearInterval(timer); }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 20, minHeight: 400 }}>
      <div style={{ fontSize: 52, animation: "pulse 2s ease-in-out infinite" }}>🔮</div>
      <p style={{ color: t.textSec, fontSize: 17, fontFamily: F.body, margin: 0 }}>{msgs[i]}</p>
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────
function LilacMistBackground({ dark }: { dark: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow as (Window & { MIST_DARK?: boolean }) | undefined | null;
    if (win) win.MIST_DARK = dark;
  }, [dark]);

  return (
    <iframe
      ref={iframeRef}
      title="Background"
      src={`${import.meta.env.BASE_URL}lilac-mist-bg.html`}
      onLoad={e => { (e.currentTarget.contentWindow as Window & { MIST_DARK?: boolean }).MIST_DARK = dark; }}
      style={{ position: "absolute", inset: 0, zIndex: 0, width: "100%", height: "100%", border: "none" }}
    />
  );
}

function LandingArea({ t, projectCtx, onFormReady }: { t: typeof LIGHT; projectCtx?: Project; onFormReady: (img: string, fd: FormData) => void }) {
  const [image, setImage] = useState<string | null>(null);
  const isDark = t === DARK;

  return (
    <div style={{ flex: 1, overflowY: "auto", position: "relative", isolation: "isolate" }}>
      <LilacMistBackground dark={isDark} />

      {/* Ghost "Seer" */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1, overflow: "hidden", pointerEvents: "none", display: "flex", alignItems: "flex-end" }}>
        <p style={{ fontFamily: F.display, fontSize: "23.5vw", color: "#b890e0", margin: 0, padding: 0, width: "100%", textAlign: "center", opacity: 0.2, userSelect: "none", lineHeight: 0.82, letterSpacing: "-0.01em" }}>Seer</p>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 32px 100px", minHeight: "100%", pointerEvents: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40, maxWidth: 640 }}>
          <h1 style={{ fontFamily: F.serif, fontSize: "clamp(32px, 4vw, 96px)", fontWeight: 400, color: t.text, margin: "80 0 12px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
            Upload your design.<br />Get real <em style={{ fontStyle: "italic" }}>critique.</em>
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 16, color: t.textSec, margin: 0, letterSpacing: 0.2 }}>
            Structured, heuristic-based feedback — in seconds.
          </p>
        </div>

        <div style={{ width: "100%", maxWidth: 560, background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.7)", borderRadius: 20, padding: 24, boxShadow: "0 8px 32px rgba(180,140,230,0.15), inset 0 1px 0 rgba(255,255,255,0.8)", position: "relative", zIndex: 10 }}>
          <UploadZone image={image} onFile={setImage} onReset={() => setImage(null)} t={t} glass />
        </div>

        {image && (
          <FadeIn delay={80}>
            <div style={{ width: "100%", maxWidth: 560, marginTop: 16, background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.7)", borderRadius: 20, padding: 24, boxShadow: "0 8px 32px rgba(180,140,230,0.15), inset 0 1px 0 rgba(255,255,255,0.8)", position: "relative", zIndex: 10 }}>
              <ContextForm onReady={fd => onFormReady(image, fd)} t={t} projectCtx={projectCtx} />
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false);
  const t = dark ? DARK : LIGHT;

  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>(() => load("seer_projects", []));
  const [critiques, setCritiques] = useState<Critique[]>(() => load("seer_critiques", []));
  const [activeCritiqueId, setActiveCritiqueId] = useState<string | null>(null);
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"landing" | "results" | "newProject" | "editProject" | "newCritique" | "editCritique">("landing");
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCritique, setEditingCritique] = useState<Critique | null>(null);

  const [shards, setShards] = useState<number>(() => load("seer_shards", 0));
  const [badgeBouncing, setBadgeBouncing] = useState(false);
  const [shardTravelCount, setShardTravelCount] = useState(0);
  const [unlockOverlay, setUnlockOverlay] = useState<typeof LEVELS[0] | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => { persist("seer_projects", projects); }, [projects]);
  useEffect(() => { persist("seer_critiques", critiques); }, [critiques]);
  useEffect(() => { persist("seer_shards", shards); }, [shards]);

  const addShards = useCallback((n: number) => {
    setShards(prev => {
      const next = Math.round((prev + n) * 10) / 10;
      const prevLvl = getLevel(prev);
      const nextLvl = getLevel(next);
      if (nextLvl > prevLvl && nextLvl >= 0) setTimeout(() => setUnlockOverlay(LEVELS[nextLvl]), 1300);
      return next;
    });
    setShardTravelCount(Math.ceil(n));
    setTimeout(() => { setShardTravelCount(0); setBadgeBouncing(true); setTimeout(() => setBadgeBouncing(false), 600); }, 1000);
  }, []);

  const activeCritique = critiques.find(c => c.id === activeCritiqueId) || null;
  const projectCtx = pendingProjectId ? projects.find(p => p.id === pendingProjectId) : undefined;

  const goHome = () => { setActiveCritiqueId(null); setView("landing"); setPendingProjectId(null); };

  const handleSelectCritique = (id: string) => {
    const c = critiques.find(x => x.id === id);
    setActiveCritiqueId(id);
    setActiveVersionIdx(c ? c.versions.length - 1 : 0);
    setView("results");
  };

  const handleNewCritique = (projectId?: string) => {
    setPendingProjectId(projectId || null);
    setActiveCritiqueId(null);
    setView("newCritique");
  };

  const handleFormReady = (image: string, fd: FormData) => {
    setLoading(true);
    setTimeout(() => {
      const version: CritiqueVersion = { id: uid(), image, results: MOCK_RESULTS, date: dateStr() };
      const critique: Critique = { id: uid(), name: fd.productType || "Untitled critique", projectId: pendingProjectId, versions: [version], formData: fd };
      setCritiques(prev => [...prev, critique]);
      setActiveCritiqueId(critique.id);
      setActiveVersionIdx(0);
      setLoading(false);
      setView("results");
      setPendingProjectId(null);
      addShards(MOCK_RESULTS.overall_score);
    }, 3500);
  };

  const handleNewVersion = (src: string) => {
    if (!activeCritiqueId) return;
    const existing = critiques.find(x => x.id === activeCritiqueId);
    if (!existing) return;
    const newVer: CritiqueVersion = { id: uid(), image: src, results: MOCK_RESULTS, date: dateStr() };
    setCritiques(prev => prev.map(c => c.id === activeCritiqueId ? { ...c, versions: [...c.versions, newVer] } : c));
    setActiveVersionIdx(existing.versions.length);
    const prev = existing.versions[existing.versions.length - 1].results.overall_score;
    const delta = Math.max(0, MOCK_RESULTS.overall_score - prev);
    if (delta > 0) addShards(delta);
  };

  const handleSaveProject = (p: Project, image?: string) => {
    setProjects(prev => {
      const exists = prev.find(x => x.id === p.id);
      return exists ? prev.map(x => x.id === p.id ? p : x) : [...prev, p];
    });
    setEditingProject(null);
    if (image) {
      setLoading(true);
      setTimeout(() => {
        const version: CritiqueVersion = { id: uid(), image, results: MOCK_RESULTS, date: dateStr() };
        const critique: Critique = { id: uid(), name: p.name, projectId: p.id, versions: [version], formData: { productType: p.productType, primaryUsers: p.primaryUsers, constraints: p.constraints, criteria: CRITERIA_OPTIONS.filter(c => c.default).map(c => c.label) } };
        setCritiques(prev => [...prev, critique]);
        setActiveCritiqueId(critique.id);
        setActiveVersionIdx(0);
        setLoading(false);
        setView("results");
        setPendingProjectId(null);
        addShards(MOCK_RESULTS.overall_score);
      }, 3500);
    } else {
      goHome();
    }
  };

  const handleSaveCritiqueContext = (fd: FormData) => {
    if (!editingCritique) return;
    setCritiques(prev => prev.map(c => c.id === editingCritique.id ? { ...c, formData: fd } : c));
    setEditingCritique(null);
  };

  const currentView = view === "results" && activeCritique ? "results"
    : view === "newProject" || view === "editProject" ? "newProject"
    : "landing";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: dark ? DARK.bg : "#f8f5ff" }}>
      <style>{GLOBAL_CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Climate+Crisis&family=Instrument+Serif:ital@0;1&family=Chiron+GoRound+TC&display=swap" rel="stylesheet" />

      {unlockOverlay && <LevelUnlockOverlay level={unlockOverlay} onDone={() => setUnlockOverlay(null)} />}
      {shardTravelCount > 0 && <ShardTravel count={shardTravelCount} onDone={() => setShardTravelCount(0)} badgeRef={badgeRef} />}

      {/* Edit context modal */}
      {editingCritique && (
        <EditContextModal
          t={t}
          title={`Edit context — ${editingCritique.name}`}
          prefill={editingCritique.formData}
          projectCtx={editingCritique.projectId ? projects.find(p => p.id === editingCritique.projectId) : undefined}
          onSave={handleSaveCritiqueContext}
          onCancel={() => setEditingCritique(null)}
        />
      )}

      <LeftPanel
        t={t} collapsed={collapsed} onToggleCollapse={() => setCollapsed(v => !v)}
        projects={projects} critiques={critiques}
        activeCritiqueId={activeCritiqueId}
        onSelectCritique={handleSelectCritique}
        onNewCritique={handleNewCritique}
        onNewProject={() => { setEditingProject(null); setView("newProject"); }}
        onGoHome={goHome}
        onMoveCritique={(cId, pId) => setCritiques(prev => prev.map(c => c.id === cId ? { ...c, projectId: pId } : c))}
        onRenameCritique={(cId, name) => setCritiques(prev => prev.map(c => c.id === cId ? { ...c, name } : c))}
        onDeleteCritique={cId => { setCritiques(prev => prev.filter(c => c.id !== cId)); if (activeCritiqueId === cId) goHome(); }}
        onDeleteProject={pId => { setProjects(prev => prev.filter(p => p.id !== pId)); setCritiques(prev => prev.map(c => c.projectId === pId ? { ...c, projectId: null } : c)); }}
        onEditProject={p => { setEditingProject(p); setView("editProject"); }}
        onEditCritique={c => setEditingCritique(c)}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {!loading && (
          <TopNav
            t={t} dark={dark} onToggleDark={() => setDark(d => !d)}
            shards={shards} badgeRef={badgeRef} badgeBouncing={badgeBouncing}
            view={currentView} critique={activeCritique} projects={projects}
            activeVersionIdx={activeVersionIdx}
            onVersionChange={setActiveVersionIdx}
            onUploadNewVersion={handleNewVersion}
            onGoHome={goHome}
          />
        )}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <LoadingScreen t={t} />
          ) : (view === "newProject" || view === "editProject") ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "48px 32px", overflowY: "auto" }}>
              <NewProjectFlow t={t} onSave={handleSaveProject} onCancel={goHome} prefill={editingProject || undefined} />
            </div>
          ) : view === "results" && activeCritique ? (
            <ResultsScreen critique={activeCritique} activeVersionIdx={activeVersionIdx} onVersionChange={setActiveVersionIdx} onNewVersion={handleNewVersion} t={t} onShardsEarned={addShards} />
          ) : (
            <LandingArea t={t} projectCtx={projectCtx} onFormReady={handleFormReady} />
          )}
        </div>
      </div>
    </div>
  );
}
