"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gradeFor, hiddenCardFor, type AssetKind, type CharacterArt, type HiddenCardId, type Outcome } from "./byeolil-data";
import { FortuneObject, SpeechBubble, Stars } from "./byeolil-ui";
import { WakppuBreakScene, wakppuBreakThresholdFor } from "./wakppu-break-scene";
import { wakppuVariantLabels, type WakppuVariant } from "./wakppu-data";

type FortuneBallProps = {
  fortune: string;
  aside: string;
  fortuneId: number;
  wakppuVariant: WakppuVariant;
  asset: AssetKind;
  characterArt?: CharacterArt;
  outcome: Outcome | null;
  onOutcome: (value: Outcome) => boolean;
  onHiddenCardDiscover: (id: HiddenCardId) => void;
  onReveal: () => void;
};

function clamp(value: number, min = -1, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function outcomeSlotAtPoint(point: { x: number; y: number }) {
  const slots = document.querySelectorAll<HTMLElement>("[data-outcome-slot]");
  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    const left = rect.left + window.scrollX;
    const top = rect.top + window.scrollY;
    if (point.x < left || point.x > left + rect.width || point.y < top || point.y > top + rect.height) continue;
    const value = slot.dataset.outcomeSlot;
    if (value === "happened" || value === "close" || value === "missed") return value;
  }
  return null;
}

function playBreakFeedback() {
  navigator.vibrate?.([12, 20, 8]);
  try {
    const context = new AudioContext();
    const duration = 0.26;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      const time = index / context.sampleRate;
      const crackA = Math.exp(-time * 80);
      const crackB = time > 0.075 ? Math.exp(-(time - 0.075) * 95) * 0.64 : 0;
      const crackC = time > 0.15 ? Math.exp(-(time - 0.15) * 110) * 0.42 : 0;
      samples[index] = (Math.random() * 2 - 1) * (crackA + crackB + crackC);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 1250;
    filter.Q.value = 0.45;
    gain.gain.setValueAtTime(0.07, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
    source.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // 브라우저가 Web Audio를 막아도 파괴 동작은 그대로 진행한다.
  }
}

function playSliceFeedback() {
  navigator.vibrate?.([7, 16, 13]);
  try {
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const duration = 0.34;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      const time = index / context.sampleRate;
      const sweep = Math.sin(time * Math.PI * 2 * (460 + time * 2400));
      const whoosh = Math.sin(Math.min(time / 0.19, 1) * Math.PI) * Math.exp(-time * 2.8);
      const cut = time > 0.17 ? Math.exp(-(time - 0.17) * 76) : 0;
      samples[index] = sweep * whoosh * 0.32 + (Math.random() * 2 - 1) * (whoosh * 0.5 + cut * 0.8);
    }
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    highpass.type = "highpass";
    highpass.frequency.value = 720;
    gain.gain.setValueAtTime(0.045, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.connect(highpass).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
    source.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // Web Audio를 지원하지 않아도 한방컷 동작은 그대로 진행한다.
  }
}

function playCrunchFeedback(intensity = 0.5) {
  navigator.vibrate?.(intensity > 0.7 ? 9 : 5);
  try {
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const duration = 0.085 + intensity * 0.085;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    const teeth = 3 + Math.round(intensity * 3);
    for (let index = 0; index < samples.length; index += 1) {
      const time = index / context.sampleRate;
      let envelope = 0;
      for (let tooth = 0; tooth < teeth; tooth += 1) {
        const start = tooth * duration / (teeth + 0.8);
        if (time >= start) envelope += Math.exp(-(time - start) * (95 + tooth * 16));
      }
      const grain = Math.sin(time * Math.PI * 2 * (165 + intensity * 90)) * 0.22;
      samples[index] = ((Math.random() * 2 - 1) * 0.78 + grain) * envelope;
    }
    const source = context.createBufferSource();
    const lowpass = context.createBiquadFilter();
    const bandpass = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3400 + intensity * 1800;
    bandpass.type = "bandpass";
    bandpass.frequency.value = 820 + intensity * 720;
    bandpass.Q.value = 0.7;
    gain.gain.setValueAtTime(0.018 + intensity * 0.026, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.connect(lowpass).connect(bandpass).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
    source.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // Web Audio를 지원하지 않아도 조작은 그대로 진행한다.
  }
}

function playRocketFeedback() {
  navigator.vibrate?.([10, 24, 18]);
  try {
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(120, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(520, context.currentTime + 0.42);
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.46);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.46);
    oscillator.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // Web Audio를 지원하지 않아도 로켓 발사는 그대로 진행한다.
  }
}

export function FortuneBall({ fortune, aside, fortuneId, wakppuVariant, asset, characterArt, outcome, onOutcome, onHiddenCardDiscover, onReveal }: FortuneBallProps) {
  const [stage, setStage] = useState(0);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [rocketReady, setRocketReady] = useState(false);
  const [rocketLaunching, setRocketLaunching] = useState(false);
  const [launchRequested, setLaunchRequested] = useState(false);
  const [sliced, setSliced] = useState(false);
  const [overcharged, setOvercharged] = useState(false);
  const [specialCardId, setSpecialCardId] = useState<HiddenCardId | null>(null);
  const [filingOutcome, setFilingOutcome] = useState<Outcome | null>(null);
  const [cardFiled, setCardFiled] = useState(false);
  const announced = useRef(false);
  const feedbackPlayed = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<HTMLElement>(null);
  const highlightedSlotRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const slipX = useMotionValue(0);
  const slipY = useMotionValue(0);
  const breakThreshold = wakppuBreakThresholdFor(wakppuVariant);
  const broken = stage >= breakThreshold;
  const variantLabel = wakppuVariantLabels[wakppuVariant];
  const specialCard = specialCardId ? hiddenCardFor(specialCardId) : null;
  const grade = gradeFor({ fortuneId, outcome: outcome ?? "happened" });
  const hint = useMemo(() => {
    if (rocketLaunching && !cardRevealed) return "로켓 발사! 관측 카드가 내려오는 중...";
    if (broken && !rocketReady && !cardRevealed) {
      if (overcharged) return "히든 과충전! 특수 파괴 발동 중...";
      return sliced ? "슥— 한방컷! 파편 떨어지는 중..." : "파편들이 후두둑 떨어지는 중...";
    }
    if (broken && rocketReady && !cardRevealed) return "젤리가 든 로켓을 눌러 발사하기";
    if (cardFiled) return "관측 결과 분류 완료";
    if (cardRevealed) return "카드를 아래 관측 결과 분류함에 넣어주세요";
    if (broken) return "파편을 밀거나 로켓을 눌러 발사하기";
    if (stage >= breakThreshold - 1) return "거의 다 깨졌음!";
    if (stage >= Math.ceil(breakThreshold * 0.4)) return "금이 가는 중...";
    return `${variantLabel} 왁뿌볼을 톡톡 누르거나 빠르게 베기`;
  }, [breakThreshold, broken, cardFiled, cardRevealed, overcharged, rocketLaunching, rocketReady, sliced, stage, variantLabel]);

  useEffect(() => {
    boundsRef.current = rootRef.current?.closest<HTMLElement>(".phone-surface") ?? null;
    return () => highlightedSlotRef.current?.classList.remove("drop-hover");
  }, []);

  useEffect(() => {
    if (!cardRevealed || announced.current) return;
    announced.current = true;
    onReveal();
  }, [cardRevealed, onReveal]);
  const handleImpact = useCallback(() => {
    setStage((currentStage) => {
      if (currentStage >= breakThreshold) return currentStage;
      const nextStage = Math.min(currentStage + 1, breakThreshold);
      if (nextStage === breakThreshold) {
        if (!feedbackPlayed.current) {
          feedbackPlayed.current = true;
          playBreakFeedback();
        }
      } else {
        playCrunchFeedback(0.35 + nextStage / breakThreshold * 0.6);
      }
      return nextStage;
    });
  }, [breakThreshold]);

  const handleSlice = useCallback(() => {
    setSliced(true);
    setSpecialCardId("swift-slice");
    onHiddenCardDiscover("swift-slice");
    setStage((currentStage) => {
      if (currentStage >= breakThreshold) return currentStage;
      if (!feedbackPlayed.current) {
        feedbackPlayed.current = true;
        playSliceFeedback();
      }
      return breakThreshold;
    });
  }, [breakThreshold, onHiddenCardDiscover]);

  const handleChargedBreak = useCallback(() => {
    setOvercharged(true);
    setSliced(false);
    setSpecialCardId("stellar-overcharge");
    onHiddenCardDiscover("stellar-overcharge");
    if (!feedbackPlayed.current) {
      feedbackPlayed.current = true;
      playBreakFeedback();
    }
    setStage(breakThreshold);
  }, [breakThreshold, onHiddenCardDiscover]);

  const handleRocketLaunch = useCallback(() => {
    setRocketReady(false);
    setRocketLaunching(true);
    playRocketFeedback();
  }, []);

  const revealObservedCard = useCallback(() => {
    setRocketLaunching(false);
    setCardRevealed(true);
  }, []);

  const highlightOutcomeSlot = useCallback((value: Outcome | null) => {
    const next = value ? document.querySelector<HTMLElement>(`[data-outcome-slot="${value}"]`) : null;
    if (highlightedSlotRef.current === next) return;
    highlightedSlotRef.current?.classList.remove("drop-hover");
    next?.classList.add("drop-hover");
    highlightedSlotRef.current = next;
  }, []);

  const fileCard = useCallback((value: Outcome) => {
    if (cardFiled || filingOutcome) return;
    const slot = document.querySelector<HTMLElement>(`[data-outcome-slot="${value}"]`);
    const card = cardRef.current;
    setFilingOutcome(value);
    highlightOutcomeSlot(null);
    navigator.vibrate?.(18);
    if (!slot || !card) return;
    const slotRect = slot.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const targetX = slotRect.left + slotRect.width / 2;
    const targetY = slotRect.top + slotRect.height * 0.58;
    animate(slipX, slipX.get() + targetX - (cardRect.left + cardRect.width / 2), { duration: 0.34, ease: [0.3, 0.75, 0.2, 1] });
    animate(slipY, slipY.get() + targetY - (cardRect.top + cardRect.height / 2), { duration: 0.34, ease: [0.3, 0.75, 0.2, 1] });
  }, [cardFiled, filingOutcome, highlightOutcomeSlot, slipX, slipY]);

  useEffect(() => {
    if (!outcome || !cardRevealed || cardFiled || filingOutcome) return;
    const frame = window.requestAnimationFrame(() => fileCard(outcome));
    return () => window.cancelAnimationFrame(frame);
  }, [cardFiled, cardRevealed, fileCard, filingOutcome, outcome]);

  function returnSlip() {
    const options = reduceMotion
      ? { duration: 0.15 }
      : { type: "spring" as const, stiffness: 260, damping: 26 };
    animate(slipX, 0, options);
    animate(slipY, 0, options);
  }

  return (
    <div
      ref={rootRef}
      className={`fortune-ball ${broken ? "is-broken" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={cardRevealed
        ? specialCard ? `발견한 특수카드: ${specialCard.title}` : `오늘의 운세 카드: ${fortune}, ${grade.grade}, 별점 5점 중 ${grade.stars}점`
        : broken
          ? rocketLaunching
            ? "로켓이 발사되어 관측된 별일 카드를 내려보내고 있습니다."
            : "부서진 왁뿌볼 안에서 젤리가 로켓을 들고 있습니다. 로켓을 누르거나 엔터 키로 발사하세요."
          : `${hint}. 엔터 또는 스페이스 키로도 깰 수 있습니다.`}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (cardRevealed || rocketLaunching) return;
        if (broken && rocketReady) setLaunchRequested(true);
        else if (!broken) handleImpact();
      }}
    >
      <div className="fortune-ball-canvas">
        <WakppuBreakScene
          stage={stage}
          revealed={cardRevealed}
          fortune={fortune}
          fortuneId={fortuneId}
          variant={wakppuVariant}
          specialCardId={specialCardId}
          launchRequested={launchRequested}
          onImpact={handleImpact}
          onSlice={handleSlice}
          onChargedBreak={handleChargedBreak}
          onRocketReady={() => setRocketReady(true)}
          onRocketLaunch={handleRocketLaunch}
          onCardReveal={revealObservedCard}
        />
      </div>

      <AnimatePresence>
        {cardRevealed && !cardFiled && (
          <motion.div
            ref={cardRef}
            className="observed-card-drag"
            style={{ x: slipX, y: slipY }}
            initial={{ opacity: 0 }}
            animate={{ opacity: filingOutcome ? 0 : 1, scale: filingOutcome ? 0.18 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : filingOutcome ? 0.34 : 0.22, ease: "easeInOut" }}
            drag
            dragConstraints={boundsRef}
            dragElastic={reduceMotion ? 0 : 0.08}
            dragMomentum={false}
            whileDrag={{ scale: 0.46, rotate: reduceMotion ? 0 : -1.2 }}
            onDrag={(_, info) => highlightOutcomeSlot(outcomeSlotAtPoint(info.point))}
            onDragEnd={(_, info) => {
              const selectedOutcome = outcomeSlotAtPoint(info.point);
              highlightOutcomeSlot(null);
              if (selectedOutcome) {
                if (!onOutcome(selectedOutcome)) returnSlip();
              }
              else returnSlip();
            }}
            onAnimationComplete={() => {
              if (!filingOutcome) return;
              setCardFiled(true);
              setFilingOutcome(null);
            }}
            onDoubleClick={returnSlip}
          >
            <motion.div
              className={`observed-fortune-card ${specialCard ? `is-special special-${specialCard.id}` : ""}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.12, scaleY: 0.08, rotate: -9 }}
              animate={{ opacity: 1, scaleX: 1, scaleY: 1, rotate: 0 }}
              transition={reduceMotion
                ? { duration: 0.15 }
                : { duration: 1.05, ease: [0.22, 0.72, 0.2, 1] }}
            >
              <div className="observed-card-kicker"><span>{specialCard ? "별일 비밀관측국" : "별일 시상위원회"}</span><b>{specialCard ? "HIDDEN" : "AWARD"}</b></div>
              <div className="observed-card-label"><i /><span>{specialCard ? "비밀 관측 수상작" : "오늘의 하찮은 수상작"}</span><i /></div>
              <div className="observed-card-meta"><strong>{specialCard ? specialCard.code : `NO.${String(fortuneId).padStart(3, "0")}`}</strong><span className={specialCard ? undefined : `grade-badge tone-${grade.tone}`}>{specialCard ? "특수 신호" : grade.grade}</span></div>
              <h3>{specialCard?.title ?? fortune}</h3>
              {specialCard
                ? <div className="observed-card-stars" aria-hidden="true">✦✦✦✦✦</div>
                : <Stars count={grade.stars} />}
              <div className={`observed-card-art ${specialCard ? "special-card-art" : "observed-award-scene"}`}>
                {specialCard
                  ? <span aria-hidden="true">{specialCard.symbol}</span>
                  : <><FortuneObject kind={asset} characterArt={characterArt} /><SpeechBubble className="observed-award-speech">{aside.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</SpeechBubble></>}
              </div>
              <p>{specialCard ? `${specialCard.copy} · 원래 예보: ${fortune}` : "우주가 오늘의 작은 별일을 공식적으로 관측했습니다."}</p>
            </motion.div>
            <div className="card-sort-guide" aria-live="polite"><span>분류함에 넣어주세요</span><i aria-hidden="true">↓</i></div>
          </motion.div>
        )}
      </AnimatePresence>

      {(!cardRevealed || cardFiled) && <div className="fortune-ball-guide" aria-live="polite">
          <span>{hint}</span>
          {!cardRevealed && !rocketLaunching && <i aria-hidden="true"><b style={{ width: `${clamp(stage / breakThreshold, 0, 1) * 100}%` }} /></i>}
        </div>}
    </div>
  );
}
