import type { ReactNode } from "react";
import type { AssetKind, CharacterArt, Outcome, Tab } from "./byeolil-data";

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
  const source = resting ? "/byeolil-mascot-resting.png" : waiting ? "/byeolil-mascot-waiting.png" : "/byeolil-mascot-final.svg";
  return <img className={`mascot ${className}`.trim()} src={source} alt="" aria-hidden="true" />;
}

export function SpeechBubble({ children, className = "", tail = "left" }: { children: ReactNode; className?: string; tail?: "left" | "right" }) {
  return (
    <div className={`speech-bubble ${className}`.trim()}>
      <svg className="speech-bubble-outline" viewBox="0 0 116 82" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M58 1 C91 1 115 11 115 31 C115 46 94 57 62 60 L31 78 L35 58 C14 54 1 44 1 31 C1 11 25 1 58 1 Z"
          transform={tail === "right" ? "translate(116 0) scale(-1 1)" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="speech-bubble-copy">{children}</div>
    </div>
  );
}

const characterArtSources: Record<CharacterArt, string> = {
  umbrella: "/mascot-poses/mascot-umbrella.png",
  coffee: "/mascot-poses/mascot-coffee.png",
  fries: "/mascot-poses/mascot-fries.png",
  message: "/mascot-poses/mascot-message.png",
  bus: "/mascot-poses/mascot-bus.png",
  resting: "/byeolil-mascot-resting.png",
  breadHug: "/mascot-poses/mascot-bread-hug.png",
  crosswalk: "/mascot-poses/mascot-crosswalk.png",
  usb: "/mascot-poses/mascot-usb.png",
  socks: "/mascot-poses/mascot-socks.png",
  alarm: "/mascot-poses/mascot-alarm.png",
  samgak: "/mascot-poses/mascot-samgak.png",
  microwave: "/mascot-poses/mascot-microwave.png",
  sticker: "/mascot-poses/mascot-sticker.png",
  vending: "/mascot-poses/mascot-vending.png",
  tape: "/mascot-poses/mascot-tape.png",
  soda: "/mascot-poses/mascot-soda.png",
  cupnoodle: "/mascot-poses/mascot-cupnoodle.png",
  onePercent: "/mascot-poses/mascot-one-percent.png",
  fourcut: "/mascot-poses/mascot-fourcut.png",
  shuffle: "/mascot-poses/mascot-shuffle.png",
  tteokPair: "/mascot-poses/mascot-tteok-pair.png",
  perfectEgg: "/mascot-poses/mascot-perfect-egg.png",
  hoodieStrings: "/mascot-poses/mascot-hoodie-strings.png",
  strawFirst: "/mascot-poses/mascot-straw-first.png",
  oneTissue: "/mascot-poses/mascot-one-tissue.png",
  bellEscape: "/mascot-poses/mascot-bell-escape.png",
  cleanIcepop: "/mascot-poses/mascot-clean-icepop.png",
  straightSnack: "/mascot-poses/mascot-straight-snack.png",
  drySleeves: "/mascot-poses/mascot-dry-sleeves.png",
  tiedLaces: "/mascot-poses/mascot-tied-laces.png",
  cleanZipper: "/mascot-poses/mascot-clean-zipper.png",
  umbrellaSleeve: "/mascot-poses/mascot-umbrella-sleeve.png",
  pencilClick: "/mascot-poses/mascot-pencil-click.png",
  evenChopsticks: "/mascot-poses/mascot-even-chopsticks.png",
  tangerineSpiral: "/mascot-poses/mascot-tangerine-spiral.png",
  cleanYogurt: "/mascot-poses/mascot-clean-yogurt.png",
  neatSauce: "/mascot-poses/mascot-neat-sauce.png",
  oneIce: "/mascot-poses/mascot-one-ice.png",
  eraserBall: "/mascot-poses/mascot-eraser-ball.png",
  openBag: "/mascot-poses/mascot-open-bag.png",
  cardSleeve: "/mascot-poses/mascot-card-sleeve.png",
  fullEarbuds: "/mascot-poses/mascot-full-earbuds.png",
  oneStaple: "/mascot-poses/mascot-one-staple.png",
  cookieRescue: "/mascot-poses/mascot-cookie-rescue.png",
  spoonBridge: "/mascot-poses/mascot-spoon-bridge.png",
  sheetCorner: "/mascot-poses/mascot-sheet-corner.png",
  cleanPopcorn: "/mascot-poses/mascot-clean-popcorn.png",
  twinToast: "/mascot-poses/mascot-twin-toast.png",
  oneShampoo: "/mascot-poses/mascot-one-shampoo.png",
  cleanSeasoning: "/mascot-poses/mascot-clean-seasoning.png",
  peaToothpaste: "/mascot-poses/mascot-pea-toothpaste.png",
  readySlippers: "/mascot-poses/mascot-ready-slippers.png",
  soloDumpling: "/mascot-poses/mascot-solo-dumpling.png",
  softPhone: "/mascot-poses/mascot-soft-phone.png",
  shoePebble: "/mascot-poses/mascot-shoe-pebble.png",
  cableDodge: "/mascot-poses/mascot-cable-dodge.png",
  cleanCorrection: "/mascot-poses/mascot-clean-correction.png",
  flatBandage: "/mascot-poses/mascot-flat-bandage.png",
  wristHairtie: "/mascot-poses/mascot-wrist-hairtie.png",
  cleanPizza: "/mascot-poses/mascot-clean-pizza.png",
  firstPop: "/mascot-poses/mascot-first-pop.png",
  exactCable: "/mascot-poses/mascot-exact-cable.png",
  strapEscape: "/mascot-poses/mascot-strap-escape.png",
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
        <img src="/byeolil-elevator.png" alt="" />
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
      <SpeechBubble className="scene-speech">{speech.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</SpeechBubble>
    </div>
  );
}

export function OutcomeFace({ outcome }: { outcome: Outcome }) {
  return (
    <span className={`outcome-face face-${outcome}`} aria-hidden="true">
      <img src={`/outcome-mascot-${outcome}.png`} alt="" />
    </span>
  );
}

export function StatusBar() {
  return <div className="status-bar" aria-hidden="true"><strong>9:41</strong><span className="status-symbols"><i className="signal-bars"><b/><b/><b/><b/></i><i className="wifi"/><i className="battery"/></span></div>;
}

export function BottomNav({ tab, onMove }: { tab: Tab; onMove: (tab: Tab) => void }) {
  const items: Array<{ key: Tab; label: string }> = [
    { key: "today", label: "예보" },
    { key: "collection", label: "보관소" },
    { key: "records", label: "관측일지" },
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
