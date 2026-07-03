import {
  Bot,
  BrainCircuit,
  Castle,
  Compass,
  Crosshair,
  Flame,
  type LucideIcon,
  Orbit,
  Shield,
  Swords,
  Terminal,
} from "lucide-react";

export type GameUniverse =
  | "cyber"
  | "witcher"
  | "portal"
  | "elden"
  | "doom"
  | "souls"
  | "command"
  | "hades"
  | "deus"
  | "neuro";

export type UniverseTheme = {
  id: GameUniverse;
  label: string;
  eyebrow: string;
  accentClass: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
  icon: LucideIcon;
  material: string;
  signal: string;
  loading: string;
  empty: string;
};

export const universeThemes: Record<GameUniverse, UniverseTheme> = {
  cyber: {
    id: "cyber",
    label: "Night City Access",
    eyebrow: "Edgerunner Study Grid",
    accentClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/25",
    ringClass: "focus-visible:ring-primary/50",
    icon: Terminal,
    material: "rain glass, holo panels, scanlines",
    signal: "Breach the syllabus. Jack into the next exam path.",
    loading: "Booting neural access deck...",
    empty: "No signal yet. Choose a lifepath and jack in.",
  },
  witcher: {
    id: "witcher",
    label: "Kaer Morhen War Room",
    eyebrow: "Contract Board",
    accentClass: "text-accent-witcher",
    bgClass: "bg-accent-witcher/10",
    borderClass: "border-accent-witcher/25",
    ringClass: "focus-visible:ring-accent-witcher/50",
    icon: Castle,
    material: "parchment, steel, candlelit map pins",
    signal: "Take the contract. Track the weakness. Return stronger.",
    loading: "Consulting the war table...",
    empty: "The notice board is quiet. Complete a trial to reveal new contracts.",
  },
  portal: {
    id: "portal",
    label: "Aperture Study Chamber",
    eyebrow: "Cognitive Calibration",
    accentClass: "text-accent-portal",
    bgClass: "bg-accent-portal/10",
    borderClass: "border-accent-portal/25",
    ringClass: "focus-visible:ring-accent-portal/50",
    icon: Bot,
    material: "white panels, test rails, aperture rings",
    signal: "Run the chamber. The concept will comply eventually.",
    loading: "Calibrating chamber cores...",
    empty: "This chamber is idle. Ask a question to begin testing.",
  },
  elden: {
    id: "elden",
    label: "Lands Between Knowledge",
    eyebrow: "Guidance of Grace",
    accentClass: "text-accent-elden",
    bgClass: "bg-accent-elden/10",
    borderClass: "border-accent-elden/25",
    ringClass: "focus-visible:ring-accent-elden/50",
    icon: Compass,
    material: "fog, gold runes, distant starfields",
    signal: "Touch grace. Chart the realm. Challenge the hidden boss concept.",
    loading: "Lighting sites of grace...",
    empty: "The mist has not lifted from this region.",
  },
  doom: {
    id: "doom",
    label: "Practice Arena",
    eyebrow: "Slayer Drill Loop",
    accentClass: "text-accent-doom",
    bgClass: "bg-accent-doom/10",
    borderClass: "border-accent-doom/25",
    ringClass: "focus-visible:ring-accent-doom/50",
    icon: Crosshair,
    material: "industrial HUD, threat locks, impact sparks",
    signal: "Load the topic. Enter the arena. Keep the streak alive.",
    loading: "Pressurizing arena gates...",
    empty: "No target loaded. Feed the arena a topic.",
  },
  souls: {
    id: "souls",
    label: "Trial of Cinders",
    eyebrow: "Bonfire Simulation",
    accentClass: "text-accent-souls",
    bgClass: "bg-accent-souls/10",
    borderClass: "border-accent-souls/25",
    ringClass: "focus-visible:ring-accent-souls/50",
    icon: Swords,
    material: "embers, old stone, posture meters",
    signal: "The exam is unforgiving. The post-mortem is merciful.",
    loading: "Kindling the bonfire...",
    empty: "No trial is prepared. Seek a bonfire from the mock list.",
  },
  command: {
    id: "command",
    label: "Command Center",
    eyebrow: "Build Order Analytics",
    accentClass: "text-accent-command",
    bgClass: "bg-accent-command/10",
    borderClass: "border-accent-command/25",
    ringClass: "focus-visible:ring-accent-command/50",
    icon: Orbit,
    material: "tactical screens, tech trees, radar sweeps",
    signal: "Read the replay. Refine the build order. Climb the ladder.",
    loading: "Syncing command telemetry...",
    empty: "No replay data yet. Run a mock to populate the command table.",
  },
  hades: {
    id: "hades",
    label: "House of Mistakes",
    eyebrow: "Run History Ledger",
    accentClass: "text-accent-hades",
    bgClass: "bg-accent-hades/10",
    borderClass: "border-accent-hades/25",
    ringClass: "focus-visible:ring-accent-hades/50",
    icon: Flame,
    material: "obsidian ledgers, boon cards, blood echoes",
    signal: "Claim the shade. Turn the mistake into a boon.",
    loading: "Summoning shades from the ledger...",
    empty: "No shades haunt this hall. That is rare. Enjoy it.",
  },
  deus: {
    id: "deus",
    label: "Aug Lab",
    eyebrow: "Companion Implant Bay",
    accentClass: "text-accent-deus",
    bgClass: "bg-accent-deus/10",
    borderClass: "border-accent-deus/25",
    ringClass: "focus-visible:ring-accent-deus/50",
    icon: Shield,
    material: "retinal glass, cyberware slots, gold circuits",
    signal: "Equip the companion. Tune the interface. Stay in control.",
    loading: "Scanning implant bay...",
    empty: "No augmentation selected.",
  },
  neuro: {
    id: "neuro",
    label: "Neuro-OS",
    eyebrow: "Ascend Core",
    accentClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/25",
    ringClass: "focus-visible:ring-primary/50",
    icon: BrainCircuit,
    material: "deep space, glass, command glyphs",
    signal: "Study system online.",
    loading: "Booting Ascend core...",
    empty: "No data stream yet.",
  },
};

export function universeForPath(pathname: string): UniverseTheme {
  if (pathname === "/" || ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"].some((path) => pathname.startsWith(path))) return universeThemes.cyber;
  if (pathname.startsWith("/dashboard")) return universeThemes.witcher;
  if (pathname.startsWith("/tutor")) return universeThemes.portal;
  if (pathname.startsWith("/explore")) return universeThemes.elden;
  if (pathname.startsWith("/practice") || pathname.startsWith("/tests")) return universeThemes.doom;
  if (pathname.startsWith("/mock-tests")) return universeThemes.souls;
  if (pathname.startsWith("/progress")) return universeThemes.command;
  if (pathname.startsWith("/mistakes") || pathname.startsWith("/error-log")) return universeThemes.hades;
  return universeThemes.neuro;
}

export function getTheme(id: GameUniverse = "neuro") {
  return universeThemes[id];
}
