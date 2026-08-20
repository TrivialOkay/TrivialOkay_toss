"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gradeFor, type Fortune, type Outcome } from "./byeolil-data";
import { FortuneObject, SpeechBubble, Stars } from "./byeolil-ui";
import { WakppuBreakScene } from "./wakppu-break-scene";

type FortuneBallProps = {
  fortune: Fortune;
  outcome: Outcome;
  onReveal: () => void;
};

function clamp(value: number, min = -1, max = 1) {
  return Math.min(max, Math.max(min, value));
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

export function FortuneBall({ fortune, outcome, onReveal }: FortuneBallProps) {
  const [stage, setStage] = useState(0);
  const [pulled, setPulled] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [noteReady, setNoteReady] = useState(false);
  const [sliced, setSliced] = useState(false);
  const announced = useRef(false);
  const feedbackPlayed = useRef(false);
  const launchTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const slipX = useMotionValue(0);
  const slipY = useMotionValue(0);
  const broken = stage >= 5;
  const grade = gradeFor({ fortuneId: fortune.id, outcome });
  const hint = useMemo(() => {
    if (launching) return "로켓 발사 중...";
    if (broken && !noteReady && !pulled) return sliced ? "슥— 한방컷! 파편 떨어지는 중..." : "파편들이 후두둑 떨어지는 중...";
    if (broken && noteReady && !pulled) return "캐릭터가 든 로켓을 잡아당기기";
    if (pulled) return "오늘의 운세 발견";
    if (broken) return "파편을 밀거나 로켓을 잡아당기기";
    if (stage >= 4) return "거의 다 깨졌음!";
    if (stage >= 2) return "금이 가는 중...";
    return "톡톡 누르거나 빠르게 베어서 한방컷";
  }, [broken, launching, noteReady, pulled, sliced, stage]);

  useEffect(() => {
    boundsRef.current = rootRef.current?.closest<HTMLElement>(".phone-surface") ?? null;
    return () => {
      if (launchTimer.current !== null) window.clearTimeout(launchTimer.current);
    };
  }, []);

  const handleImpact = useCallback(() => {
    setStage((currentStage) => {
      if (currentStage >= 5) return currentStage;
      const nextStage = Math.min(currentStage + 1, 5);
      if (nextStage === 5) {
        if (!feedbackPlayed.current) {
          feedbackPlayed.current = true;
          playBreakFeedback();
        }
      } else {
        playCrunchFeedback(0.35 + nextStage * 0.12);
      }
      return nextStage;
    });
  }, []);

  const handleSlice = useCallback(() => {
    setSliced(true);
    setStage((currentStage) => {
      if (currentStage >= 5) return currentStage;
      if (!feedbackPlayed.current) {
        feedbackPlayed.current = true;
        playSliceFeedback();
      }
      return 5;
    });
  }, []);

  const revealPulledSlip = useCallback(() => {
    if (!announced.current) {
      announced.current = true;
      onReveal();
    }
    setPulled(true);
  }, [onReveal]);

  const startRocketLaunch = useCallback(() => {
    if (launchTimer.current !== null || announced.current) return;
    setLaunching(true);
    navigator.vibrate?.(reduceMotion ? 12 : [16, 28, 42]);
    launchTimer.current = window.setTimeout(() => {
      launchTimer.current = null;
      revealPulledSlip();
    }, reduceMotion ? 180 : 950);
  }, [reduceMotion, revealPulledSlip]);

  function pullSlipWithKeyboard() {
    startRocketLaunch();
  }

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
      aria-label={pulled
        ? `오늘의 운세 카드: ${fortune.cardTitle}, ${grade.grade}, 별점 5점 중 ${grade.stars}점`
        : broken
          ? "부서진 왁뿌볼 안에 로켓이 있습니다. 끌어당기거나 엔터 키로 꺼내세요."
          : `${hint}. 엔터 또는 스페이스 키로도 깰 수 있습니다.`}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (pulled || launching) return;
        if (broken && noteReady) pullSlipWithKeyboard();
        else if (!broken) handleImpact();
      }}
    >
      <div className="fortune-ball-canvas">
        <WakppuBreakScene
          stage={stage}
          revealed={pulled || launching}
          fortune={fortune.title}
          fortuneId={fortune.id}
          onImpact={handleImpact}
          onSlice={handleSlice}
          onNoteReady={() => setNoteReady(true)}
          onNotePull={startRocketLaunch}
        />
      </div>

      <AnimatePresence>
        {launching && !pulled && (
          <motion.div
            className="rocket-launch"
            initial={{ opacity: 0, scale: 0.94, x: 0, y: 0, rotate: 0 }}
            animate={reduceMotion
              ? { opacity: [0, 1, 0] }
              : { opacity: [0, 1, 1, 0], scale: [0.94, 1, 1.03, 1.06], x: [0, -2, 3, 8], y: [0, 0, -20, -330], rotate: [0, -1, 1, 2] }}
            transition={reduceMotion
              ? { duration: 0.18, times: [0, 0.35, 1] }
              : { duration: 0.95, times: [0, 0.08, 0.26, 1], ease: [0.22, 0.72, 0.2, 1] }}
            aria-hidden="true"
          >
            <span className="rocket-launch-body" />
            {!reduceMotion && <span className="rocket-launch-flame"><i/><b/></span>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pulled && (
          <motion.div
            className="fortune-slip-drag"
            style={{ x: slipX, y: slipY }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.22 }}
            drag
            dragConstraints={boundsRef}
            dragElastic={reduceMotion ? 0 : 0.16}
            dragMomentum={!reduceMotion}
            dragTransition={{ bounceStiffness: 260, bounceDamping: 26, power: 0.32, timeConstant: 220 }}
            whileDrag={reduceMotion ? { scale: 1.02 } : { scale: 1.035, rotate: -1.2 }}
            onDoubleClick={returnSlip}
          >
            <motion.article
              className="fortune-slip"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.18, scaleY: 0.26, rotate: -7 }}
              animate={{ opacity: 1, scaleX: 1, scaleY: 1, rotate: 0 }}
              transition={reduceMotion
                ? { duration: 0.15 }
                : { duration: 1.05, ease: [0.22, 0.72, 0.2, 1] }}
            >
              <div className="fortune-award-masthead"><strong>별일 시상위원회</strong><span>AWARD</span></div>
              <div className="fortune-award-label"><i/><span>오늘의 하찮은 수상작</span><i/></div>
              <div className="fortune-award-meta"><strong>NO.{String(fortune.id).padStart(3, "0")}</strong><span className={`grade-badge tone-${grade.tone}`}>{grade.grade}</span></div>
              <h3>{fortune.cardTitle}</h3>
              <Stars count={grade.stars} />
              <div className="fortune-award-scene">
                <FortuneObject kind={fortune.asset} characterArt={fortune.characterArt} />
                <SpeechBubble className="fortune-award-speech">{fortune.aside.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</SpeechBubble>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fortune-ball-guide" aria-live="polite">
        <span>{hint}</span>
        {!pulled && <i aria-hidden="true"><b style={{ width: `${clamp(stage / 5, 0, 1) * 100}%` }} /></i>}
      </div>
    </div>
  );
}
