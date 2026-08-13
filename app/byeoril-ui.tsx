import type { ReactNode } from "react";
import type { AssetKind, CharacterArt, Outcome, Tab } from "./byeoril-data";

type IconName = "back" | "camera" | "chart" | "chevron-down" | "chevron-right" | "help" | "home" | "more" | "refresh" | "search" | "settings" | "share";

const iconPaths: Record<IconName, ReactNode> = {
  back: <path d="m15 5-7 7 7 7" />,
  camera: <><path d="M4 7.5h3l1.4-2h7.2l1.4 2h3v11H4Z"/><circle cx="12" cy="13" r="3.2"/></>,
  chart: <><path d="M5 19V9M12 19V5M19 19v-7"/><path d="M3 19h18"/></>,
  "chevron-down": <path d="m7 9.5 5 5 5-5" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9.3a2.35 2.35 0 1 1 3.7 1.92c-.92.64-1.5 1.14-1.5 2.28M12 17h.01"/></>,
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  more: <><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></>,
  refresh: <><path d="M20 6.8v5h-5"/><path d="M19.2 11.8a7.6 7.6 0 1 0-1.4 5.5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.2"/><path d="m15 15 5 5"/></>,
  settings: <><circle cx="12" cy="12" r="3.2"/><path d="m19 13.2 1.7 1.3-1.8 3.1-2.1-.8a7 7 0 0 1-2.1 1.2l-.3 2.3h-3.6l-.3-2.3a7 7 0 0 1-2.1-1.2l-2.1.8-1.8-3.1L6 13.2a7 7 0 0 1 0-2.4L4.4 9.5l1.8-3.1 2.1.8A7 7 0 0 1 10.5 6l.3-2.3h3.6l.3 2.3a7 7 0 0 1 2.1 1.2l2.1-.8 1.8 3.1-1.7 1.3a7 7 0 0 1 0 2.4Z"/></>,
  share: <><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 8-5M8 13l8 5"/></>,
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`line-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">{iconPaths[name]}</svg>;
}

export function Mascot({ className = "", resting = false, waiting = false }: { className?: string; resting?: boolean; waiting?: boolean }) {
  const source = resting ? "/byeoril-mascot-resting.png" : waiting ? "/byeoril-mascot-waiting.png" : "/byeoril-mascot-final.svg";
  return <img className={`mascot ${className}`.trim()} src={source} alt="" aria-hidden="true" />;
}

const characterArtSources: Record<CharacterArt, string> = {
  umbrella: "/mascot-poses/mascot-umbrella.png",
  coffee: "/mascot-poses/mascot-coffee.png",
  fries: "/mascot-poses/mascot-fries.png",
  message: "/mascot-poses/mascot-message.png",
  bus: "/mascot-poses/mascot-bus.png",
  resting: "/byeoril-mascot-resting.png",
};

export function Stars({ count, small = false }: { count: number; small?: boolean }) {
  return (
    <span className={`stars ${small ? "stars-small" : ""}`} aria-label={`별점 5점 중 ${count}점`}>
      {Array.from({ length: 5 }, (_, index) => <span key={index} className={index < count ? "filled" : "empty"}>★</span>)}
    </span>
  );
}

export function FortuneObject({ kind, compact = false, characterArt }: { kind: AssetKind; compact?: boolean; characterArt?: CharacterArt }) {
  if (characterArt) {
    return <span className={`object-art object-character-pose pose-${characterArt} ${compact ? "compact" : ""}`} aria-hidden="true"><img src={characterArtSources[characterArt]} alt="" /></span>;
  }
  if (kind === "elevator") {
    return (
      <span className={`object-art elevator-art ${compact ? "compact" : ""}`} aria-hidden="true">
        <img src="/byeoril-elevator.png" alt="" />
      </span>
    );
  }
  if (kind === "mascot") {
    return <span className={`object-art object-mascot ${compact ? "compact" : ""}`} aria-hidden="true"><Mascot /></span>;
  }
  return <span className={`object-art object-${kind} ${compact ? "compact" : ""}`} aria-hidden="true"><i/><b/><em/></span>;
}

export function FortuneScene({ kind, speech, card = false, characterArt }: { kind: AssetKind; speech: string; card?: boolean; characterArt?: CharacterArt }) {
  return (
    <div className={`fortune-scene scene-${kind} ${card ? "scene-card" : ""}`} role="img" aria-label="오늘의 별일 손그림 장면">
      {kind === "elevator" && <><span className="scene-floor-plane"/><span className="scene-depth-shadow"/></>}
      <span className="scene-spark spark-a"/><span className="scene-spark spark-b"/><span className="scene-spark spark-c"/>
      <FortuneObject kind={kind} characterArt={characterArt} />
      {!characterArt && kind !== "mascot" && <Mascot className="scene-character" resting={kind === "book" || kind === "laundry"} waiting={kind === "elevator"} />}
      <span className="scene-speech">{speech.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</span>
    </div>
  );
}

export function OutcomeFace({ outcome }: { outcome: Outcome }) {
  return <span className={`outcome-face face-${outcome}`} aria-hidden="true"><i className="eye left"/><i className="eye right"/><i className="expression"/></span>;
}

export function StatusBar() {
  return <div className="status-bar" aria-hidden="true"><strong>9:41</strong><span className="status-symbols"><i className="signal-bars"><b/><b/><b/><b/></i><i className="wifi"/><i className="battery"/></span></div>;
}

export function BottomNav({ tab, onMove }: { tab: Tab; onMove: (tab: Tab) => void }) {
  const items: Array<{ key: Tab; label: string }> = [
    { key: "today", label: "오늘" },
    { key: "collection", label: "도감" },
    { key: "records", label: "기록" },
    { key: "about", label: "내 정보" },
  ];
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {items.map((item) => (
        <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => onMove(item.key)} aria-current={tab === item.key ? "page" : undefined}>
          <span className={`nav-icon nav-${item.key}`} aria-hidden="true"><i/><b/></span><span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
