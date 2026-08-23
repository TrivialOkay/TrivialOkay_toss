"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hiddenCardFor, type AssetKind, type CharacterArt, type HiddenCardId, type Outcome } from "./byeolil-data";
import { FortuneObject } from "./byeolil-ui";
import { WakppuBreakScene, wakppuBreakThresholdFor } from "./wakppu-break-scene";
import { wakppuVariantLabels, type WakppuVariant } from "./wakppu-data";

type FortuneBallProps = {
  fortune: string;
  fortuneId: number;
  wakppuVariant: WakppuVariant;
  asset: AssetKind;
  characterArt?: CharacterArt;
  outcome: Outcome | null;
  onOutcome: (value: Outcome) => boolean;
  onHiddenCardDiscover: (id: HiddenCardId) => void;
  onReveal: () => void;
  recallVersion?: number;
};

function clamp(value: number, min = -1, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function outcomeSlotAtPoint(point: { x: number; y: number }, magnetRadius = 68) {
  const slots = document.querySelectorAll<HTMLElement>("[data-outcome-slot]");
  let nearest: { value: Outcome; distance: number } | null = null;
  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    const left = rect.left + window.scrollX;
    const top = rect.top + window.scrollY;
    const value = slot.dataset.outcomeSlot;
    if (value !== "happened" && value !== "close" && value !== "missed") continue;
    const dx = Math.max(left - point.x, 0, point.x - (left + rect.width));
    const dy = Math.max(top - point.y, 0, point.y - (top + rect.height));
    const distance = Math.hypot(dx, dy);
    if (distance <= magnetRadius && (!nearest || distance < nearest.distance)) nearest = { value, distance };
  }
  return nearest?.value ?? null;
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function createNoiseBuffer(context: AudioContext, duration: number, sample: (time: number) => number) {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) samples[index] = sample(index / context.sampleRate);
  return buffer;
}

function playBlackHoleFeedback(pulse = false) {
  navigator.vibrate?.(pulse ? 8 : [18, 28, 38]);
  try {
    const context = createAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const duration = pulse ? 0.32 : 1.35;
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(pulse ? 0.075 : 0.12, now + (pulse ? 0.018 : 0.09));
    master.gain.exponentialRampToValueAtTime(0.001, now + duration);
    master.connect(compressor).connect(context.destination);

    const rumble = context.createOscillator();
    const rumbleGain = context.createGain();
    rumble.type = "sine";
    rumble.frequency.setValueAtTime(pulse ? 68 : 54, now);
    rumble.frequency.exponentialRampToValueAtTime(pulse ? 31 : 19, now + duration * 0.72);
    if (!pulse) rumble.frequency.exponentialRampToValueAtTime(42, now + duration);
    rumbleGain.gain.value = pulse ? 0.62 : 0.82;
    rumble.connect(rumbleGain).connect(master);

    const warp = context.createOscillator();
    const warpFilter = context.createBiquadFilter();
    const warpGain = context.createGain();
    warp.type = "sawtooth";
    warp.frequency.setValueAtTime(pulse ? 118 : 96, now);
    warp.frequency.exponentialRampToValueAtTime(pulse ? 46 : 28, now + duration);
    warp.detune.setValueAtTime(-17, now);
    warpFilter.type = "lowpass";
    warpFilter.frequency.setValueAtTime(pulse ? 390 : 620, now);
    warpFilter.frequency.exponentialRampToValueAtTime(92, now + duration);
    warpGain.gain.value = pulse ? 0.13 : 0.2;
    warp.connect(warpFilter).connect(warpGain).connect(master);

    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = createNoiseBuffer(context, duration, (time) => {
      const pull = Math.sin(Math.min(1, time / duration) * Math.PI);
      return (Math.random() * 2 - 1) * pull;
    });
    noiseFilter.type = "bandpass";
    noiseFilter.Q.value = pulse ? 1.2 : 2.4;
    noiseFilter.frequency.setValueAtTime(pulse ? 620 : 1800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(pulse ? 160 : 115, now + duration);
    noiseGain.gain.value = pulse ? 0.16 : 0.28;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);

    rumble.start(now); warp.start(now); noise.start(now);
    rumble.stop(now + duration); warp.stop(now + duration); noise.stop(now + duration);
    noise.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // Web Audio를 지원하지 않아도 블랙홀 관측은 그대로 진행한다.
  }
}

function playRocketFeedback() {
  navigator.vibrate?.([10, 24, 18]);
  try {
    const context = createAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const toneGain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(92, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(610, context.currentTime + 0.56);
    toneGain.gain.setValueAtTime(0.032, context.currentTime);
    toneGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.64);
    oscillator.connect(toneGain).connect(context.destination);

    const exhaust = context.createBufferSource();
    const exhaustFilter = context.createBiquadFilter();
    const exhaustGain = context.createGain();
    exhaust.buffer = createNoiseBuffer(context, 0.68, (time) => (Math.random() * 2 - 1) * Math.sin(Math.min(1, time / 0.5) * Math.PI));
    exhaustFilter.type = "bandpass";
    exhaustFilter.frequency.setValueAtTime(260, context.currentTime);
    exhaustFilter.frequency.exponentialRampToValueAtTime(2400, context.currentTime + 0.58);
    exhaustFilter.Q.value = 0.7;
    exhaustGain.gain.setValueAtTime(0.035, context.currentTime);
    exhaustGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.68);
    exhaust.connect(exhaustFilter).connect(exhaustGain).connect(context.destination);
    oscillator.start();
    exhaust.start();
    oscillator.stop(context.currentTime + 0.65);
    exhaust.stop(context.currentTime + 0.68);
    exhaust.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // Web Audio를 지원하지 않아도 로켓 발사는 그대로 진행한다.
  }
}

function playWakppuImpactFeedback(variant: WakppuVariant, final: boolean, intensity = 0.5) {
  if (variant === "blackHole") {
    playBlackHoleFeedback(!final);
    return;
  }
  const profiles: Record<WakppuVariant, {
    filter: BiquadFilterType;
    noiseFrom: number;
    noiseTo: number;
    tone: OscillatorType;
    toneFrom: number;
    toneTo: number;
    vibration: number | number[];
  }> = {
    chewyCookie: { filter: "lowpass", noiseFrom: 1700, noiseTo: 460, tone: "sine", toneFrom: 118, toneTo: 76, vibration: final ? [12, 18, 16] : 6 },
    butterBar: { filter: "bandpass", noiseFrom: 3200, noiseTo: 980, tone: "triangle", toneFrom: 410, toneTo: 170, vibration: final ? [8, 12, 8, 20] : 5 },
    sun: { filter: "bandpass", noiseFrom: 520, noiseTo: 4400, tone: "sawtooth", toneFrom: 94, toneTo: 38, vibration: final ? [18, 24, 48] : 8 },
    earth: { filter: "highpass", noiseFrom: 760, noiseTo: 2600, tone: "sine", toneFrom: 190, toneTo: 72, vibration: final ? [11, 15, 19] : 6 },
    mars: { filter: "bandpass", noiseFrom: 1400, noiseTo: 360, tone: "triangle", toneFrom: 164, toneTo: 58, vibration: final ? [13, 12, 25] : 7 },
    jupiter: { filter: "lowpass", noiseFrom: 920, noiseTo: 180, tone: "sawtooth", toneFrom: 132, toneTo: 45, vibration: final ? [10, 28, 18] : 6 },
    moon: { filter: "bandpass", noiseFrom: 880, noiseTo: 420, tone: "square", toneFrom: 142, toneTo: 68, vibration: final ? [18, 13, 30] : 9 },
    saturn: { filter: "highpass", noiseFrom: 1800, noiseTo: 5200, tone: "sine", toneFrom: 740, toneTo: 250, vibration: final ? [7, 15, 7, 22] : 5 },
    volcano: { filter: "lowpass", noiseFrom: 2600, noiseTo: 120, tone: "sawtooth", toneFrom: 88, toneTo: 30, vibration: final ? [22, 25, 62] : 9 },
    tomato: { filter: "lowpass", noiseFrom: 760, noiseTo: 150, tone: "sine", toneFrom: 126, toneTo: 48, vibration: final ? [7, 18, 12] : 4 },
    ice: { filter: "highpass", noiseFrom: 2200, noiseTo: 7200, tone: "sine", toneFrom: 1380, toneTo: 430, vibration: final ? [5, 10, 5, 18] : 4 },
    cheese: { filter: "bandpass", noiseFrom: 640, noiseTo: 1900, tone: "triangle", toneFrom: 188, toneTo: 310, vibration: final ? [7, 14, 11] : 4 },
    animal: { filter: "bandpass", noiseFrom: 1200, noiseTo: 2900, tone: "triangle", toneFrom: 260, toneTo: 540, vibration: final ? [6, 16, 9] : 4 },
    blackHole: { filter: "lowpass", noiseFrom: 280, noiseTo: 80, tone: "sine", toneFrom: 54, toneTo: 20, vibration: [18, 28, 38] },
    cloudMascot: { filter: "bandpass", noiseFrom: 260, noiseTo: 3400, tone: "sine", toneFrom: 330, toneTo: 780, vibration: final ? [5, 20, 7] : 3 },
  };
  const profile = profiles[variant];
  navigator.vibrate?.(profile.vibration);
  try {
    const context = createAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const duration = final ? (variant === "sun" || variant === "volcano" ? 0.92 : 0.62) : 0.12 + intensity * 0.07;
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    master.gain.setValueAtTime(final ? 0.11 : 0.026 + intensity * 0.018, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + duration);
    master.connect(compressor).connect(context.destination);

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    source.buffer = createNoiseBuffer(context, duration, (time) => {
      const hit = Math.exp(-time * (final ? 6.5 : 28));
      const secondary = final && time > 0.09 ? Math.exp(-(time - 0.09) * 18) * 0.56 : 0;
      return (Math.random() * 2 - 1) * (hit + secondary);
    });
    filter.type = profile.filter;
    filter.Q.value = profile.filter === "bandpass" ? 1.15 : 0.68;
    filter.frequency.setValueAtTime(profile.noiseFrom, now);
    filter.frequency.exponentialRampToValueAtTime(profile.noiseTo, now + duration);
    source.connect(filter).connect(master);

    const oscillator = context.createOscillator();
    const toneGain = context.createGain();
    oscillator.type = profile.tone;
    oscillator.frequency.setValueAtTime(profile.toneFrom, now);
    oscillator.frequency.exponentialRampToValueAtTime(profile.toneTo, now + duration);
    toneGain.gain.setValueAtTime(final ? 0.42 : 0.16, now);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(toneGain).connect(master);

    if (variant === "ice" || variant === "saturn") {
      const overtone = context.createOscillator();
      const overtoneGain = context.createGain();
      overtone.type = "sine";
      overtone.frequency.setValueAtTime(profile.toneFrom * 1.62, now);
      overtone.frequency.exponentialRampToValueAtTime(profile.toneTo * 1.4, now + duration);
      overtoneGain.gain.setValueAtTime(final ? 0.2 : 0.08, now);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      overtone.connect(overtoneGain).connect(master);
      overtone.start(now);
      overtone.stop(now + duration);
    }
    source.start(now);
    oscillator.start(now);
    source.stop(now + duration);
    oscillator.stop(now + duration);
    source.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // Web Audio를 지원하지 않아도 왁뿌볼 파괴는 그대로 진행한다.
  }
}

function playHiddenCommandFeedback(id: HiddenCardId, blackHoleVariant: boolean) {
  const vibration: Record<HiddenCardId, number[]> = {
    "swift-slice": [8, 20, 18, 35, 12],
    "stellar-overcharge": [26, 34, 95, 48, 34],
    "quantum-entanglement": [10, 22, 10, 22, 32],
    "abracada-crack": [7, 13, 7, 13, 7, 34, 20],
    "mirror-dimension": [9, 18, 9, 18, 42],
    "gravity-reversal": [18, 45, 12, 28, 46],
  };
  navigator.vibrate?.(vibration[id]);

  try {
    const context = createAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const duration = id === "stellar-overcharge" ? 2.35 : id === "mirror-dimension" ? 1.95 : 1.35;
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 14;
    compressor.ratio.value = 7;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(id === "stellar-overcharge" ? 0.2 : 0.135, now + 0.025);
    master.gain.exponentialRampToValueAtTime(0.001, now + duration);
    master.connect(compressor).connect(context.destination);

    const tone = (
      type: OscillatorType,
      from: number,
      to: number,
      level: number,
      start = 0,
      length = duration - start,
      detune = 0,
    ) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, now + start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(12, to), now + start + length);
      oscillator.detune.value = detune;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(level, now + start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + length);
      oscillator.connect(gain).connect(master);
      oscillator.start(now + start);
      oscillator.stop(now + start + length + 0.02);
    };
    const noise = (
      filterType: BiquadFilterType,
      from: number,
      to: number,
      level: number,
      start = 0,
      length = duration - start,
    ) => {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = createNoiseBuffer(context, length, (time) => {
        const attack = Math.min(1, time / 0.028);
        const tail = Math.exp(-time / Math.max(length * 0.62, 0.08));
        return (Math.random() * 2 - 1) * attack * tail;
      });
      filter.type = filterType;
      filter.Q.value = filterType === "bandpass" ? 1.8 : 0.7;
      filter.frequency.setValueAtTime(from, now + start);
      filter.frequency.exponentialRampToValueAtTime(to, now + start + length);
      gain.gain.setValueAtTime(level, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + length);
      source.connect(filter).connect(gain).connect(master);
      source.start(now + start);
      source.stop(now + start + length);
    };

    if (id === "stellar-overcharge") {
      tone("sine", 82, 24, 0.92, 0, 1.75);
      tone("sawtooth", 164, 39, 0.24, 0.02, 1.2, -12);
      tone("sine", 1260, 180, 0.12, 0, 0.54);
      noise("lowpass", 7200, 105, 0.78, 0.015, 2.25);
      noise("bandpass", 2600, 180, 0.32, 0.24, 1.8);
    } else if (id === "quantum-entanglement") {
      tone("sine", 214, 1260, 0.32, 0, 1.15, -22);
      tone("sine", 231, 710, 0.32, 0, 1.15, 22);
      tone("triangle", 1680, 320, 0.2, 0.22, 0.86);
      noise("bandpass", 3400, 680, 0.22, 0.06, 1.16);
    } else if (id === "abracada-crack") {
      [0, 0.11, 0.22, 0.34].forEach((start, index) => {
        tone("sawtooth", 820 + index * 260, 3100 - index * 310, 0.18, start, 0.18);
      });
      tone("sine", 156, 46, 0.52, 0.37, 0.86);
      noise("highpass", 1100, 5600, 0.34, 0, 0.78);
    } else if (id === "mirror-dimension") {
      tone("sine", 118, 72, 0.32, 0, 1.9);
      tone("triangle", 310, 1240, 0.2, 0, 1.34, -18);
      tone("triangle", 465, 1860, 0.18, 0.08, 1.42, 18);
      [0.18, 0.38, 0.62].forEach((start, index) => tone("sine", 920 + index * 310, 470, 0.12, start, 0.62));
      noise("bandpass", 220, 5200, 0.34, 0, 1.78);
    } else if (id === "gravity-reversal") {
      tone("sine", 46, 640, 0.56, 0, 1.25);
      tone("sawtooth", 78, 1180, 0.17, 0.06, 1.1, -14);
      noise("bandpass", 140, 4300, 0.3, 0.08, 1.16);
    } else {
      tone("triangle", 210, 2900, 0.26, 0, 0.3);
      tone("sine", 118, 42, 0.52, 0.17, 0.72);
      noise("highpass", 850, 6500, 0.38, 0, 0.66);
    }

    window.setTimeout(() => { void context.close(); }, (duration + 0.2) * 1000);
    if (blackHoleVariant) window.setTimeout(() => playBlackHoleFeedback(true), 80);
  } catch {
    // Web Audio를 지원하지 않아도 히든 상호작용은 그대로 진행한다.
  }
}

export function FortuneBall({ fortune, fortuneId, wakppuVariant, asset, characterArt, outcome, onOutcome, onHiddenCardDiscover, onReveal, recallVersion = 0 }: FortuneBallProps) {
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
  const [cardRecalling, setCardRecalling] = useState(false);
  const announced = useRef(false);
  const feedbackPlayed = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const highlightedSlotRef = useRef<HTMLElement>(null);
  const handledRecallRef = useRef(0);
  const recalledOutcomeRef = useRef<Outcome | null>(null);
  const reduceMotion = useReducedMotion();
  const slipX = useMotionValue(0);
  const slipY = useMotionValue(0);
  const breakThreshold = wakppuBreakThresholdFor(wakppuVariant);
  const broken = stage >= breakThreshold;
  const variantLabel = wakppuVariantLabels[wakppuVariant];
  const specialCard = specialCardId ? hiddenCardFor(specialCardId) : null;
  const hint = useMemo(() => {
    if (rocketLaunching && !cardRevealed) return "로켓 발사! 관측 카드가 내려오는 중...";
    if (broken && !rocketReady && !cardRevealed) {
      if (specialCardId === "quantum-entanglement") return "양자 얽힘! 두 신호가 동시에 붕괴 중...";
      if (specialCardId === "abracada-crack") return "아브라다-깨다브라! 주문 균열 확산 중...";
      if (specialCardId === "mirror-dimension") return "미러 디멘션 개방! 공간이 접히는 중...";
      if (specialCardId === "gravity-reversal") return "중력 역전! 파편이 위로 낙하하는 중...";
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
  }, [breakThreshold, broken, cardFiled, cardRevealed, overcharged, rocketLaunching, rocketReady, sliced, specialCardId, stage, variantLabel]);

  useEffect(() => {
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
          playWakppuImpactFeedback(wakppuVariant, true, 1);
        }
      } else {
        playWakppuImpactFeedback(wakppuVariant, false, 0.35 + nextStage / breakThreshold * 0.6);
      }
      return nextStage;
    });
  }, [breakThreshold, wakppuVariant]);

  const playVariantEffect = useCallback((fallback: () => void) => {
    if (wakppuVariant === "blackHole") playBlackHoleFeedback();
    else fallback();
  }, [wakppuVariant]);

  const handleSlice = useCallback(() => {
    setSliced(true);
    setSpecialCardId("swift-slice");
    onHiddenCardDiscover("swift-slice");
    setStage((currentStage) => {
      if (currentStage >= breakThreshold) return currentStage;
      if (!feedbackPlayed.current) {
        feedbackPlayed.current = true;
        playHiddenCommandFeedback("swift-slice", wakppuVariant === "blackHole");
      }
      return breakThreshold;
    });
  }, [breakThreshold, onHiddenCardDiscover, wakppuVariant]);

  const handleChargedBreak = useCallback(() => {
    setOvercharged(true);
    setSliced(false);
    setSpecialCardId("stellar-overcharge");
    onHiddenCardDiscover("stellar-overcharge");
    if (!feedbackPlayed.current) {
      feedbackPlayed.current = true;
      playHiddenCommandFeedback("stellar-overcharge", wakppuVariant === "blackHole");
    }
    setStage(breakThreshold);
  }, [breakThreshold, onHiddenCardDiscover, wakppuVariant]);

  const handleEntangledBreak = useCallback(() => {
    setSliced(false);
    setOvercharged(false);
    setSpecialCardId("quantum-entanglement");
    onHiddenCardDiscover("quantum-entanglement");
    if (!feedbackPlayed.current) {
      feedbackPlayed.current = true;
      playHiddenCommandFeedback("quantum-entanglement", wakppuVariant === "blackHole");
    }
    setStage(breakThreshold);
  }, [breakThreshold, onHiddenCardDiscover, wakppuVariant]);

  const handleSpellBreak = useCallback(() => {
    setSliced(false);
    setOvercharged(false);
    setSpecialCardId("abracada-crack");
    onHiddenCardDiscover("abracada-crack");
    if (!feedbackPlayed.current) {
      feedbackPlayed.current = true;
      playHiddenCommandFeedback("abracada-crack", wakppuVariant === "blackHole");
    }
    setStage(breakThreshold);
  }, [breakThreshold, onHiddenCardDiscover, wakppuVariant]);

  const handlePortalBreak = useCallback(() => {
    setSliced(false);
    setOvercharged(false);
    setSpecialCardId("mirror-dimension");
    onHiddenCardDiscover("mirror-dimension");
    if (!feedbackPlayed.current) {
      feedbackPlayed.current = true;
      playHiddenCommandFeedback("mirror-dimension", wakppuVariant === "blackHole");
    }
    setStage(breakThreshold);
  }, [breakThreshold, onHiddenCardDiscover, wakppuVariant]);

  const handleGravityBreak = useCallback(() => {
    setSliced(false);
    setOvercharged(false);
    setSpecialCardId("gravity-reversal");
    onHiddenCardDiscover("gravity-reversal");
    if (!feedbackPlayed.current) {
      feedbackPlayed.current = true;
      playHiddenCommandFeedback("gravity-reversal", wakppuVariant === "blackHole");
    }
    setStage(breakThreshold);
  }, [breakThreshold, onHiddenCardDiscover, wakppuVariant]);

  const handleRocketLaunch = useCallback(() => {
    setRocketReady(false);
    setRocketLaunching(true);
    playVariantEffect(playRocketFeedback);
  }, [playVariantEffect]);

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
    recalledOutcomeRef.current = null;
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
    if (recalledOutcomeRef.current === outcome) return;
    const frame = window.requestAnimationFrame(() => fileCard(outcome));
    return () => window.cancelAnimationFrame(frame);
  }, [cardFiled, cardRevealed, fileCard, filingOutcome, outcome]);

  useEffect(() => {
    if (!recallVersion || handledRecallRef.current === recallVersion) return;
    if (!cardFiled) return;
    handledRecallRef.current = recallVersion;
    let timer = 0;
    const frame = window.requestAnimationFrame(() => {
      recalledOutcomeRef.current = outcome;
      setCardRecalling(true);
      setCardFiled(false);
      navigator.vibrate?.(10);
      animate(slipX, 0, reduceMotion ? { duration: 0.15 } : { duration: 0.48, ease: [0.22, 0.72, 0.2, 1] });
      animate(slipY, 0, reduceMotion ? { duration: 0.15 } : { duration: 0.48, ease: [0.22, 0.72, 0.2, 1] });
      timer = window.setTimeout(() => setCardRecalling(false), reduceMotion ? 180 : 520);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [cardFiled, outcome, recallVersion, reduceMotion, slipX, slipY]);

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
        ? specialCard ? `발견한 특수카드: ${specialCard.title}` : `관측된 별일 카드: ${fortune}`
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
          onEntangledBreak={handleEntangledBreak}
          onSpellBreak={handleSpellBreak}
          onPortalBreak={handlePortalBreak}
          onGravityBreak={handleGravityBreak}
          onRocketReady={() => setRocketReady(true)}
          onRocketLaunch={handleRocketLaunch}
          onCardReveal={revealObservedCard}
        />
      </div>

      <AnimatePresence>
        {cardRevealed && !cardFiled && (
          <motion.div
            ref={cardRef}
            className={`observed-card-drag ${cardRecalling ? "is-recalling" : ""}`}
            style={{ x: slipX, y: slipY }}
            initial={cardRecalling ? { opacity: 0.25, scale: 0.18 } : { opacity: 0 }}
            animate={{ opacity: filingOutcome ? 0 : 1, scale: filingOutcome ? 0.18 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : filingOutcome ? 0.34 : 0.22, ease: "easeInOut" }}
            drag
            dragConstraints={{ left: -168, right: 168, top: -92, bottom: 560 }}
            dragElastic={reduceMotion ? 0 : 0.12}
            dragMomentum={false}
            whileDrag={{ scale: 0.46, rotate: reduceMotion ? 0 : -1.2 }}
            onDrag={(_, info) => highlightOutcomeSlot(outcomeSlotAtPoint(info.point))}
            onDragEnd={(_, info) => {
              const selectedOutcome = outcomeSlotAtPoint(info.point);
              highlightOutcomeSlot(null);
              if (selectedOutcome) {
                if (onOutcome(selectedOutcome)) fileCard(selectedOutcome);
                else returnSlip();
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
              initial={cardRecalling ? { opacity: 1, scaleX: 1, scaleY: 1, rotate: 0 } : reduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.12, scaleY: 0.08, rotate: -9 }}
              animate={{ opacity: 1, scaleX: 1, scaleY: 1, rotate: 0 }}
              transition={reduceMotion
                ? { duration: 0.15 }
                : { duration: 1.05, ease: [0.22, 0.72, 0.2, 1] }}
            >
              <div className="observed-card-kicker"><span>{specialCard ? "별일 비밀관측국" : "별일 관측국"}</span><b>{specialCard ? "HIDDEN" : "관측 완료"}</b></div>
              <div className="observed-card-meta"><strong>{specialCard ? specialCard.code : `NO.${String(fortuneId).padStart(3, "0")}`}</strong><span>{specialCard ? "특수 신호" : "오늘 좀 됨"}</span></div>
              <h3>{specialCard?.title ?? fortune}</h3>
              <div className="observed-card-stars" aria-hidden="true">{specialCard ? "✦✦✦✦✦" : "★★★★☆"}</div>
              <div className={`observed-card-art ${specialCard ? "special-card-art" : ""}`}>
                {specialCard ? <span aria-hidden="true">{specialCard.symbol}</span> : <FortuneObject kind={asset} characterArt={characterArt} />}
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
