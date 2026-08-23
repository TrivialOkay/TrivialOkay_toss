"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { closeView, graniteEvent, Screen } from "@apps-in-toss/web-framework";
import {
  categories,
  dateLabel,
  fortuneFor,
  fortunes,
  gradeFor,
  gradeGuide,
  hiddenCardFor,
  hiddenCards,
  localDateKey,
  localTimeLabel,
  monthKey,
  monthLabel,
  outcomeMeta,
  shiftMonth,
  type Category,
  type HiddenCardId,
  type Outcome,
  type RecordItem,
  type Tab,
  type View,
} from "./byeolil-data";
import { clearRecords, loadHiddenCards, loadObservedWakppu, loadRecords, saveHiddenCards, saveObservedWakppu, saveRecords } from "./byeolil-storage";
import { BottomNav, BureauCode, FortuneObject, FortuneScene, Icon, Mascot, OutcomeFace, Stars } from "./byeolil-ui";
import { blackHoleUnlockCount, wakppuCatalog, wakppuVariantFor, type WakppuVariant } from "./wakppu-data";

const FortuneBall = lazy(() => import("./fortune-ball").then((module) => ({ default: module.FortuneBall })));

const outcomeLabels: Record<Outcome, string> = {
  happened: "정확 관측",
  close: "근접 관측",
  missed: "신호 없음",
};

const outcomeDescriptions: Record<Outcome, string> = {
  happened: "예보 그대로",
  close: "비슷하게 발생",
  missed: "일어나지 않음",
};

const collectionPageSize = 12;
const recordsPageSize = 5;
type ArchiveView = "hub" | "fortune" | "hidden" | "evidence";

type ByeolilHistoryState = {
  byeolilNavigation: true;
  depth: number;
  tab: Tab;
  view: View;
  archiveView: ArchiveView;
  activeRecordId: string | null;
};

function Pagination({ page, totalPages, onPage, showSinglePage = false }: { page: number; totalPages: number; onPage: (page: number) => void; showSinglePage?: boolean }) {
  if (totalPages <= 1 && !showSinglePage) return null;

  const firstPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const visiblePages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index);

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button className="pagination-arrow" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="이전 페이지">‹</button>
      {visiblePages.map((item) => <button key={item} className={page === item ? "active" : ""} onClick={() => onPage(item)} aria-current={page === item ? "page" : undefined}>{item}</button>)}
      <button className="pagination-arrow" disabled={page === totalPages} onClick={() => onPage(page + 1)} aria-label="다음 페이지">›</button>
    </nav>
  );
}

function awardTitle(record: Pick<RecordItem, "fortuneId" | "title">) {
  const awards = ["뜻밖의 평화상", "아슬아슬 생존상", "쓸데없이 정확상", "오늘의 피식상", "3% 우주 기여상"];
  return awards[record.fortuneId % awards.length];
}

function archiveTypeFor(record: Pick<RecordItem, "outcome" | "fortuneId" | "title">) {
  const grade = gradeFor(record);
  if (grade.stars >= 4) return { key: "award" as const, label: "하찮은 수상작", mark: "AWARD" };
  if (record.outcome === "happened") return { key: "news" as const, label: "별일 속보", mark: "LIVE" };
  return { key: "observation" as const, label: "관측 보고서", mark: "OBS." };
}

const evidenceMilestones = [
  { count: 0, title: "관측 수습", tier: "rookie" },
  { count: 3, title: "현장 목격자", tier: "witness" },
  { count: 7, title: "증거 수집가", tier: "collector" },
  { count: 15, title: "우주 특파원", tier: "correspondent" },
] as const;

function evidenceRewardFor(count: number) {
  const current = [...evidenceMilestones].reverse().find((milestone) => count >= milestone.count) ?? evidenceMilestones[0];
  const next = evidenceMilestones.find((milestone) => milestone.count > count);
  return { ...current, next };
}

function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <header className="screen-header">
      <span className="header-side">{onBack && <button className="icon-button" onClick={onBack} aria-label="뒤로 가기"><Icon name="back" /></button>}</span>
      <h1>{title}</h1>
      <span className="header-side header-right">{right}</span>
    </header>
  );
}

const monthlyThemeNames = [
  "따뜻한 겨울", "포근한 마음", "새싹의 시작", "벚꽃 나들이",
  "봄 소풍", "장마 산책", "수박 한입", "한여름 물놀이",
  "보름달 간식", "단풍 놀이", "군고구마 온기", "연말 선물",
] as const;

const maxPhotoFileSize = 12 * 1024 * 1024;
const maxPhotoDimension = 1280;

function dailyFortuneIndex(date = new Date()) {
  return Number(localDateKey(date).replaceAll("-", "")) % fortunes.length;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("사진을 불러오지 못했어요"));
    image.src = source;
  });
}

async function optimizePhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 선택할 수 있어요");
  if (file.size > maxPhotoFileSize) throw new Error("사진은 12MB 이하만 선택할 수 있어요");

  const source = URL.createObjectURL(file);
  try {
    const image = await loadImage(source);
    const scale = Math.min(1, maxPhotoDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진을 처리하지 못했어요");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(source);
  }
}

function MonthlyMascot({ month, className = "" }: { month: number; className?: string }) {
  const safeMonth = Math.min(12, Math.max(1, month));
  const fileMonth = String(safeMonth).padStart(2, "0");
  return (
    <img
      className={`monthly-mascot ${className}`.trim()}
      src={`/monthly-mascots/month-${fileMonth}.png`}
      alt=""
      aria-hidden="true"
      title={`${safeMonth}월 · ${monthlyThemeNames[safeMonth - 1]}`}
    />
  );
}

function TodayScreen({
  fortuneIndex,
  wakppuVariant,
  revealed,
  outcome,
  hiddenCardId,
  onOutcome,
  onRecall,
  onCycleWakppu,
  onNewFortune,
  onHiddenCardDiscover,
  onReveal,
  onConfirm,
  onCapture,
  classificationConfirmed,
  onAbout,
}: {
  fortuneIndex: number;
  wakppuVariant: WakppuVariant;
  revealed: boolean;
  outcome: Outcome | null;
  hiddenCardId: HiddenCardId | null;
  onOutcome: (value: Outcome) => boolean;
  onRecall: () => void;
  onCycleWakppu: () => void;
  onNewFortune: () => void;
  onHiddenCardDiscover: (id: HiddenCardId) => void;
  onReveal: () => void;
  onConfirm: () => void;
  onCapture: () => void;
  classificationConfirmed: boolean;
  onAbout: () => void;
}) {
  const fortune = fortunes[fortuneIndex];
  const outcomeSectionRef = useRef<HTMLElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const recallGestureRef = useRef<{ pointerId: number; startY: number; triggered: boolean } | null>(null);
  const suppressRecallClickRef = useRef(false);
  const [recallVersion, setRecallVersion] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  function recallFiledCard() {
    onRecall();
    outcomeSectionRef.current?.querySelectorAll("button").forEach((button) => button.blur());
    setRecallVersion((version) => version + 1);
  }

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => {
      const section = outcomeSectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const visibleBottom = window.innerHeight - 105;
      if (rect.top >= 76 && rect.bottom <= visibleBottom) return;
      window.scrollTo({
        top: Math.max(0, window.scrollY + rect.bottom - visibleBottom),
        behavior: "smooth",
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  useEffect(() => {
    if (!outcome) return;
    const timer = window.setTimeout(() => {
      const button = confirmButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const visibleBottom = window.innerHeight - 105;
      if (rect.top >= 76 && rect.bottom <= visibleBottom) return;
      window.scrollTo({
        top: Math.max(0, window.scrollY + rect.bottom - visibleBottom),
        behavior: "smooth",
      });
    }, 430);
    return () => window.clearTimeout(timer);
  }, [outcome]);

  return (
    <>
      <header className="today-header"><div><h1>별일 관측국</h1><small>오늘의 미세한 우주 개입 예보</small><span className="today-signal"><i />관측소 01 · KST · SIGNAL 03%</span></div><button className="icon-button" onClick={onAbout} aria-label="내 정보 열기"><Icon name="settings" /></button></header>
      <section className="screen-content today-screen" aria-labelledby="today-date">
        <div className="today-date-row">
          <time className="date-button" id="today-date" dateTime={localDateKey()}>{dateLabel()}</time>
          <span className="today-quick-actions">
            <button className="outline-button usage-button" onClick={() => setHelpOpen(true)} aria-label="운세 관측 사용법"><b>?</b>사용법</button>
            <button className="outline-button fortune-refresh" onClick={onCycleWakppu}><Icon name="refresh" />다른 왁뿌볼 불러오기</button>
          </span>
        </div>
        <article className={`fortune-card ${revealed ? "is-card-revealed" : ""}`}>
          <div className="fortune-kicker"><span className="crystal-ball" />오늘의 별일 예보<span className={`observation-live ${revealed ? "is-complete" : ""}`}>{revealed ? "관측 완료" : "신호 수신 중"}</span></div>
          <h2>{revealed ? hiddenCardId ? hiddenCardFor(hiddenCardId).title : fortune.title : "왁뿌볼 안에 든 운세를 꺼내보세요."}</h2>
          <p>{revealed ? hiddenCardId ? "비정규 상호작용 포착 · 분류 결정 전까지 미등록" : "우주 기여도 3% · 큰 기대는 금물!" : "돌리고, 누르고, 문지르면 예보가 나옵니다."}</p>
          <Suspense fallback={<div className="fortune-ball-loading" role="status">왁뿌볼 불러오는 중...</div>}>
            <FortuneBall key={`${fortune.id}-${wakppuVariant}`} fortune={fortune.cardTitle} fortuneId={fortune.id} wakppuVariant={wakppuVariant} asset={fortune.asset} characterArt={fortune.characterArt} outcome={outcome} onOutcome={onOutcome} onHiddenCardDiscover={onHiddenCardDiscover} onReveal={onReveal} recallVersion={recallVersion} />
          </Suspense>
        </article>
        <section ref={outcomeSectionRef} className={`outcome-section ${revealed ? "" : "is-locked"}`} aria-hidden={!revealed}>
          <div className="outcome-sorter-head"><span>OBS SORTER · 03</span><b><i />{outcome ? "결정 대기" : "분류 대기"}</b></div>
          <h2>관측 결과 분류함</h2>
          <p>카드를 실제 결과와 맞는 투입구에 넣어주세요</p>
          <div className="outcome-grid" role="group" aria-label="오늘의 운세 결과">
            {(Object.keys(outcomeMeta) as Outcome[]).map((key) => (
              <button
                key={key}
                data-outcome-slot={key}
                disabled={!revealed}
                className={`outcome-button outcome-${key} ${outcome === key ? "selected is-recallable" : ""}`}
                onPointerDown={(event) => {
                  if (outcome !== key) return;
                  recallGestureRef.current = { pointerId: event.pointerId, startY: event.clientY, triggered: false };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const gesture = recallGestureRef.current;
                  if (!gesture || gesture.pointerId !== event.pointerId || gesture.triggered) return;
                  if (gesture.startY - event.clientY < 24) return;
                  gesture.triggered = true;
                  suppressRecallClickRef.current = true;
                  recallFiledCard();
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                  recallGestureRef.current = null;
                }}
                onPointerCancel={() => { recallGestureRef.current = null; }}
                onClick={() => {
                  if (suppressRecallClickRef.current) {
                    suppressRecallClickRef.current = false;
                    return;
                  }
                  if (outcome === key) recallFiledCard();
                  else onOutcome(key);
                }}
                aria-label={outcome === key ? `${outcomeLabels[key]} 카드 다시 꺼내기` : outcomeLabels[key]}
                aria-pressed={outcome === key}
              >
                <span className="outcome-button-head"><OutcomeFace outcome={key} /><strong>{outcomeLabels[key]}</strong></span>
                <span className="outcome-card-slot" aria-hidden="true"><i /></span>
                <small>{outcome === key ? "위로 당겨 다시 분류" : outcomeDescriptions[key]}</small>
              </button>
            ))}
          </div>
        </section>
        <div className="classification-action-row">
          <button ref={confirmButtonRef} className="black-button classification-confirm-button" disabled={!outcome} onClick={onConfirm}>
            <span><small>{outcome ? outcomeLabels[outcome] : "분류 필요"}</small><strong>분류 결정</strong></span><Icon name="chevron-right" />
          </button>
          <button className="outline-button fortune-redraw-button" onClick={(event) => { event.currentTarget.blur(); onNewFortune(); }}>
            <Icon name="refresh" /><span><small>현재 선택은 저장 안 됨</small><strong>운세 다시 뽑기</strong></span>
          </button>
        </div>
        <button className="photo-record-button" aria-label="현장 증거 더하기" disabled={!classificationConfirmed} onClick={onCapture}><span className="camera-symbol"><Icon name="camera" /></span><strong>{classificationConfirmed ? <>현장 증거 더하기 <small>(사진 선택)</small></> : outcome ? "분류 결정 후 추가할 수 있어요" : revealed ? "카드를 분류하면 기록할 수 있어요" : "예보를 꺼내면 관측할 수 있어요"}</strong><Icon name="chevron-right" /></button>
      </section>
      {helpOpen && <div className="flow-help-backdrop">
        <section className="flow-help-dialog" role="dialog" aria-modal="true" aria-labelledby="flow-help-title">
          <div className="flow-help-head"><span><small>별일 관측국 초간단 안내</small><h2 id="flow-help-title">운세는 이렇게 모아요</h2></span><button onClick={() => setHelpOpen(false)} aria-label="도움말 닫기">×</button></div>
          <ol>
            <li><b>1</b><span><strong>왁뿌볼을 깨요</strong><small>톡톡 누르거나 빠르게 문질러도 돼요.</small></span></li>
            <li><b>2</b><span><strong>나온 카드를 분류함에 넣어요</strong><small>실제로 일어났는지에 맞는 칸을 고르면 돼요.</small></span></li>
            <li><b>3</b><span><strong>분류 결정을 눌러요</strong><small>이 버튼을 눌러야 운세가 도감에 저장돼요.</small></span></li>
            <li><b>4</b><span><strong>획득한 카드를 확인해요</strong><small>뒤로 가면 도감에서 다시 볼 수 있어요.</small></span></li>
          </ol>
          <button className="black-button flow-help-close" onClick={() => setHelpOpen(false)}>알겠어요</button>
        </section>
      </div>}
    </>
  );
}

function CaptureScreen({
  record,
  evidenceCount,
  category,
  note,
  photo,
  onBack,
  onCategory,
  onNote,
  onPhoto,
  onSave,
  onSkip,
}: {
  record: RecordItem;
  evidenceCount: number;
  category: Category;
  note: string;
  photo: string | null;
  onBack: () => void;
  onCategory: (value: Category) => void;
  onNote: (value: string) => void;
  onPhoto: (file: File) => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fortune = fortuneFor(record.fortuneId);
  const grade = gradeFor(record);
  const earnsEvidence = Boolean(photo && !record.photoDataUrl);
  const previewEvidenceCount = evidenceCount + (earnsEvidence ? 1 : 0);
  const previewReward = evidenceRewardFor(previewEvidenceCount);
  return (
    <>
      <Header title="관측 증거 부착실" onBack={onBack} />
      <section className="screen-content capture-screen">
        <BureauCode status="CARD LINKED">현장 증거 부착 · EVIDENCE LAB 02</BureauCode>
        <div className="evidence-target-label"><span>부착 대상 카드</span><b>기본 기록 저장 완료</b></div>
        <article className="evidence-target-card">
          <div className="evidence-target-meta"><strong>NO.{String(record.fortuneId).padStart(3, "0")}</strong><span className={`grade-badge tone-${grade.tone}`}>{grade.grade}</span></div>
          <div className="evidence-target-body"><span className="evidence-target-art"><FortuneObject kind={fortune.asset} characterArt={fortune.characterArt} compact /></span><span><small>{outcomeLabels[record.outcome]} · {record.category}</small><strong>{record.title}</strong></span></div>
          <div className="evidence-target-status"><i />{record.photoDataUrl ? "현장 증거 등록 카드" : "사진 증거 연결 대기"}</div>
        </article>
        <div className="evidence-connector" aria-hidden="true"><i /><span>이 카드에 아래 증거가 연결됩니다</span><i /></div>
        <h2>현장 사진 <span>(선택)</span></h2>
        <div className={`evidence-benefit ${photo ? "is-ready" : ""}`}><span>✦</span><strong>{earnsEvidence ? "부착 완료 시 별가루 +1" : photo ? "현장 증거 교체 준비 완료" : "사진을 붙이면 별가루 +1"}</strong><small>{previewReward.title} · 별가루 {previewEvidenceCount}개{previewReward.next ? ` · 다음 칭호까지 ${previewReward.next.count - previewEvidenceCount}장` : " · 최고 칭호 달성"}</small></div>
        <button className={`capture-photo ${photo ? "has-photo" : ""}`} onClick={() => inputRef.current?.click()} aria-label="사진 선택 또는 변경">
          {photo ? <img src={photo} alt={`${record.title}의 현장 증거`} /> : <span className="capture-placeholder"><span className="empty-evidence-frame"><Icon name="camera" /><strong>이 카드의 현장 사진 붙이기</strong><small>사진을 찍거나 앨범에서 선택</small></span><Mascot className="capture-mascot" /></span>}
          <span className="photo-change"><Icon name="camera" />{photo ? "사진 변경" : "사진 선택"}</span>
          {photo && <span className="capture-preview-stamp">증거<br/><b>부착 예정</b></span>}
        </button>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPhoto(file); event.target.value = ""; }} />
        <h2>관측 정보 <span>(선택 보강)</span></h2>
        <div className="category-grid" role="group" aria-label="기록 카테고리">
          {categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => onCategory(item)}>{item}</button>)}
        </div>
        <label className="memo-field">짧은 한 줄 메모 <span>(선택)</span><textarea value={note} maxLength={40} onChange={(event) => onNote(event.target.value)} placeholder="버튼 누르려 했는데 이미 열려있음 ㅋㅋ"/><small>{note.length}/40</small></label>
        <div className="evidence-submit-actions"><button className="black-button record-submit" onClick={onSave}>{photo ? "증거 부착 완료" : "관측 정보 저장"}</button><button className="outline-button evidence-skip" onClick={onSkip}>{photo ? "취소하고 카드 보기" : "일단 카드만 보기"}</button></div>
      </section>
    </>
  );
}

function CardScreen({ record, evidenceCount, occurrenceCount, onBack, onShare, onCollection, onReplay, onDelete, onEvidence }: { record: RecordItem; evidenceCount: number; occurrenceCount: number; onBack: () => void; onShare: () => void; onCollection: () => void; onReplay: () => void; onDelete: () => void; onEvidence: () => void }) {
  const fortune = fortuneFor(record.fortuneId);
  const grade = gradeFor(record);
  const archiveType = archiveTypeFor(record);
  const evidenceReward = evidenceRewardFor(evidenceCount);
  return (
    <>
      <Header title={archiveType.label} onBack={onBack} right={<><button className="icon-button" onClick={onShare} aria-label="공유하기"><Icon name="share" /></button><button className="icon-button" onClick={onDelete} aria-label="카드 삭제"><Icon name="more" /></button></>} />
      <section className="screen-content card-screen">
        <BureauCode status={archiveType.mark}>공식 관측 출력물 · OBS-{String(record.fortuneId).padStart(3, "0")}</BureauCode>
        <article className={`result-card archive-detail-card archive-detail-${archiveType.key} ${record.photoDataUrl ? `has-field-evidence evidence-tier-${evidenceReward.tier}` : ""}`}>
          <div className="news-masthead"><strong>{archiveType.key === "news" ? "별일 속보국" : archiveType.key === "award" ? "별일 시상위원회" : "우주 관측 보고서"}</strong><span>{archiveType.mark}</span></div>
          <p className="breaking-label">{archiveType.key === "news" ? "방금 들어온 별일" : archiveType.key === "award" ? "오늘의 하찮은 수상작" : "미세한 우주 개입 관측 결과"}</p>
          <div className="result-meta"><strong>NO.{String(record.fortuneId).padStart(3, "0")}</strong><span className={`grade-badge tone-${grade.tone}`}>{grade.grade}</span></div>
          <h2>{record.title}</h2>
          <Stars count={grade.stars} />
          {record.photoDataUrl ? <div className="card-photo"><img src={record.photoDataUrl} alt="기록 사진" /><span className="field-evidence-stamp">현장 증거<br/><b>확보 완료</b></span></div> : <FortuneScene kind={fortune.asset} speech={fortune.aside} characterArt={fortune.characterArt} card />}
          {record.photoDataUrl && <div className="evidence-card-reward"><span>✦ 별가루 {evidenceCount}</span><strong>{evidenceReward.title}</strong></div>}
          {archiveType.key === "news" && <div className="news-ticker">속보 · 실제 발생 · 인명 피해 없음</div>}
          {archiveType.key === "observation" && <div className="cosmic-metrics"><span><small>개입도</small><strong>{grade.stars}%</strong></span><span><small>관측 오차</small><strong>{record.outcome === "close" ? "1cm" : "3cm"}</strong></span><span><small>우주 태도</small><strong>소극적</strong></span></div>}
          {archiveType.key === "award" && <div className="tiny-award award-presentation"><span>본 기록을 공식 수상작으로 인정합니다</span><strong>{awardTitle(record)}</strong><small>우주 기여도 {grade.stars}%</small></div>}
          <div className="interpretation"><strong>관측국의 쓸데없이 진지한 해석</strong><p>{fortune.copy}</p><Mascot className="interpretation-mascot" /></div>
          {record.note && <p className="record-quote">“{record.note}”</p>}
          <dl className="card-stats"><div><dt>발견 날짜</dt><dd>{record.date.replaceAll("-", ".")}</dd></div><div><dt>발견 시간</dt><dd>{record.time}</dd></div><div><dt>별일 횟수</dt><dd>{occurrenceCount}회</dd></div></dl>
        </article>
        <button className={`evidence-edit-button ${record.photoDataUrl ? "has-evidence" : ""}`} onClick={onEvidence}><span><Icon name="camera" /></span><strong>{record.photoDataUrl ? "이 카드의 증거 교체하기" : "이 카드에 현장 증거 붙이기"}<small>{record.photoDataUrl ? "별가루는 그대로 유지돼요" : "사진 증거를 붙이면 별가루 +1"}</small></strong><Icon name="chevron-right" /></button>
        <div className="card-actions"><button className="outline-button" onClick={onReplay}><Icon name="refresh" />새 운세 뽑기</button><button className="black-button" onClick={onShare}><Icon name="share" />공유하기</button><button className="outline-button" onClick={onCollection}><span className="tiny-picture"/>도감으로</button></div>
      </section>
    </>
  );
}

function HiddenCardResultScreen({ cardId, onBack, onCollection, onReplay }: { cardId: HiddenCardId; onBack: () => void; onCollection: () => void; onReplay: () => void }) {
  const card = hiddenCardFor(cardId);
  return (
    <>
      <Header title="히든 상호작용 카드" onBack={onBack} />
      <section className="screen-content hidden-result-screen">
        <BureauCode status="도감 등록 완료">비정규 신호 확정본 · SECRET COMMAND</BureauCode>
        <article className={`hidden-result-card hidden-result-${card.id}`}>
          <div className="hidden-result-head"><span>별일 비밀관측국</span><b>HIDDEN</b></div>
          <div className="hidden-result-code"><strong>{card.code}</strong><span>특수 상호작용</span></div>
          <div className="hidden-result-symbol" aria-hidden="true">{card.symbol}</div>
          <small>{card.label}</small>
          <h2>{card.title}</h2>
          <p>{card.copy}</p>
          <div className="hidden-result-stamp">비정규 관측 승인<br/><b>ARCHIVED</b></div>
        </article>
        <p className="hidden-result-notice">일반 운세 카드는 등록하지 않고, 이 히든 카드만 비밀 보관함에 넣었어요.</p>
        <div className="hidden-result-actions"><button className="black-button" onClick={onCollection}>히든 도감에서 보기</button><button className="outline-button" onClick={onReplay}><Icon name="refresh" />새 운세 뽑기</button></div>
      </section>
    </>
  );
}

type CollectionStatus = "all" | "observed" | "locked";

function WakppuOrb({ variant, locked = false }: { variant: WakppuVariant; locked?: boolean }) {
  return <span className={`wakppu-orb wakppu-orb-${variant} ${locked ? "is-locked" : ""}`} aria-hidden="true"><i/><b/><em/></span>;
}

function WakppuCatalogScreen({ observed, onBack }: { observed: WakppuVariant[]; onBack: () => void }) {
  const [status, setStatus] = useState<CollectionStatus>("all");
  const observedSet = new Set(observed);
  const visibleCatalog = wakppuCatalog.filter((item) => status === "all" || (status === "observed" ? observedSet.has(item.id) : !observedSet.has(item.id)));
  const completion = Math.round((observed.length / wakppuCatalog.length) * 100);
  const heroVariant: WakppuVariant = observed.includes("saturn") ? "saturn" : observed[0] ?? "moon";
  const visibleObservedCount = observed.filter((variant) => variant !== "blackHole").length;
  const blackHoleUnlocked = visibleObservedCount >= blackHoleUnlockCount;
  return (
    <>
      <Header title="왁뿌볼 천체도감" onBack={onBack} />
      <section className="screen-content wakppu-catalog-screen">
        <BureauCode status={`${completion}% 관측`}>미확인 천체 보관록 · CELESTIAL ARCHIVE</BureauCode>
        <div className="wakppu-catalog-hero">
          <span><small>별일 관측국 · 천체 복원율</small><strong>깨뜨려 관측한<br/>왁뿌볼의 흔적</strong><b>{observed.length} / {wakppuCatalog.length}</b></span>
          <div className="wakppu-hero-orbits" aria-hidden="true"><i/><b/><WakppuOrb variant={heroVariant} locked={!observed.length}/></div>
          <em><i style={{ width: `${completion}%` }} /></em>
        </div>
        <p className="wakppu-catalog-intro">왁뿌볼을 깨고 안쪽 신호까지 확인하면 천체도감에 등록돼요.</p>
        <div className={`black-hole-unlock ${blackHoleUnlocked ? "is-unlocked" : ""}`}><span>{blackHoleUnlocked ? "✦" : "?"}</span><span><small>히든 천체 신호</small><strong>{blackHoleUnlocked ? "중력 특이점 출현 조건 해제" : `천체 ${blackHoleUnlockCount}종을 관측하면 신호가 열려요`}</strong></span><b>{Math.min(visibleObservedCount, blackHoleUnlockCount)} / {blackHoleUnlockCount}</b><i><em style={{ width: `${Math.min(100, (visibleObservedCount / blackHoleUnlockCount) * 100)}%` }} /></i></div>
        <div className="collection-status-row" role="group" aria-label="왁뿌볼 관측 상태 필터">
          {([ ["all", "전체"], ["observed", "관측 완료"], ["locked", "미관측"] ] as const).map(([key, label]) => <button key={key} className={status === key ? "active" : ""} onClick={() => setStatus(key)}>{label}</button>)}
        </div>
        <div className="wakppu-catalog-grid">
          {visibleCatalog.map((item) => {
            const isObserved = observedSet.has(item.id);
            const isHidden = item.id === "blackHole" && !blackHoleUnlocked && !isObserved;
            const isEligible = item.id === "blackHole" && blackHoleUnlocked && !isObserved;
            return <article key={item.id} className={`${isObserved ? "is-observed" : "is-locked"} ${isHidden ? "is-hidden" : ""} ${isEligible ? "is-eligible" : ""}`} aria-label={isObserved ? `${item.name}, 관측 완료` : isHidden ? "히든 천체, 출현 조건 미달성" : `${item.code}, 미관측`}>
              <div className="wakppu-catalog-card-head"><small>{isHidden ? "WAK-??" : item.code}</small><span>{isObserved ? item.rarity : isHidden ? "HIDDEN" : isEligible ? "SIGNAL OPEN" : "SIGNAL LOST"}</span></div>
              <WakppuOrb variant={isHidden ? "moon" : item.id} locked={!isObserved}/>
              <div className="wakppu-catalog-copy"><small>{isObserved ? item.label : isHidden ? "특수 관측 조건" : isEligible ? item.label : "미확인 천체"}</small><strong>{isObserved ? item.name : isHidden ? "???" : isEligible ? "블랙홀 신호 해제" : "신호 미수신"}</strong><p>{isObserved ? item.copy : isHidden ? `천체 ${blackHoleUnlockCount}종 관측 시 정체가 드러납니다. 현재 ${visibleObservedCount}종.` : isEligible ? "이제 블랙홀 왁뿌볼이 출현할 수 있습니다." : "이 형태의 왁뿌볼을 깨면 관측 정보가 복원됩니다."}</p></div>
            </article>;
          })}
          {!visibleCatalog.length && <div className="empty-state compact"><Mascot/><strong>조건에 맞는 천체가 없어요.</strong></div>}
        </div>
      </section>
    </>
  );
}

function CollectionScreen({ observedFortuneIds, observedWakppu, discoveredHiddenCardIds, records, searchOpen, search, archiveView, onSearchOpen, onSearch, onOpen, onWakppu, onArchive, onBack }: { observedFortuneIds: number[]; observedWakppu: WakppuVariant[]; discoveredHiddenCardIds: HiddenCardId[]; records: RecordItem[]; searchOpen: boolean; search: string; archiveView: ArchiveView; onSearchOpen: () => void; onSearch: (value: string) => void; onOpen: (fortuneId: number) => void; onWakppu: () => void; onArchive: (view: Exclude<ArchiveView, "hub">) => void; onBack: () => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CollectionStatus>("all");
  const observedIds = new Set(observedFortuneIds);
  const catalog = [...fortunes].sort((left, right) => left.id - right.id);
  const filtered = catalog
    .filter((fortune) => {
      const observed = observedIds.has(fortune.id);
      const matchesStatus = status === "all" || (status === "observed" ? observed : !observed);
      const query = search.trim();
      const matchesSearch = !query || (observed && fortune.cardTitle.includes(query));
      return matchesStatus && matchesSearch;
    })
    .sort((left, right) => {
      const observedOrder = Number(observedIds.has(right.id)) - Number(observedIds.has(left.id));
      return observedOrder || left.id - right.id;
    });
  const totalPages = Math.max(1, Math.ceil(filtered.length / collectionPageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleFortunes = filtered.slice((currentPage - 1) * collectionPageSize, currentPage * collectionPageSize);
  const completion = Math.round((observedFortuneIds.length / catalog.length) * 100);
  const evidenceRecords = records.filter((record) => record.photoDataUrl);
  const evidenceIds = new Set(evidenceRecords.map((record) => record.fortuneId));
  const evidenceReward = evidenceRewardFor(evidenceRecords.length);
  const evidenceProgress = evidenceReward.next ? Math.round(((evidenceRecords.length - evidenceReward.count) / (evidenceReward.next.count - evidenceReward.count)) * 100) : 100;

  function openArchive(view: "fortune" | "hidden" | "evidence") {
    onArchive(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeArchive() {
    if (searchOpen) {
      setPage(1);
      onSearch("");
      onSearchOpen();
    }
    onBack();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (archiveView === "hub") return (
    <>
      <Header title="별일 보관소" />
      <section className="screen-content collection-screen collection-hub-screen">
        <BureauCode status="4개 도감 운영 중">관측 자료 보관 구역 · ARCHIVE 01</BureauCode>
        <p className="collection-hub-intro">확인할 도감을 선택하세요. 각 보관록은 별도 열람실에서 볼 수 있어요.</p>
        <div className="collection-archive-grid" aria-label="도감 바로가기">
          <button className="archive-hub-card archive-hub-fortune" onClick={() => openArchive("fortune")}>
            <span className="archive-hub-meta"><small>관측 카드</small><b>{observedFortuneIds.length} / {catalog.length}</b></span>
            <strong>별일 운세 도감</strong>
            <span className="archive-hub-symbol" aria-hidden="true">✦</span>
            <i role="progressbar" aria-label="운세 도감 수집률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><em style={{ width: `${completion}%` }} /></i>
          </button>
          <button className="archive-hub-card archive-hub-wakppu" onClick={onWakppu}>
            <span className="archive-hub-meta"><small>미확인 천체</small><b>{observedWakppu.length} / {wakppuCatalog.length}</b></span>
            <strong>왁뿌볼 천체도감</strong>
            <span className="archive-hub-orbs" aria-hidden="true"><WakppuOrb variant="moon" locked={!observedWakppu.includes("moon")}/><WakppuOrb variant="saturn" locked={!observedWakppu.includes("saturn")}/></span>
            <i><em style={{ width: `${Math.round((observedWakppu.length / wakppuCatalog.length) * 100)}%` }} /></i>
          </button>
          <button className="archive-hub-card archive-hub-hidden" onClick={() => openArchive("hidden")}>
            <span className="archive-hub-meta"><small>비정규 신호</small><b>{discoveredHiddenCardIds.length} / {hiddenCards.length}</b></span>
            <strong>히든 상호작용 카드</strong>
            <span className="archive-hub-symbol" aria-hidden="true">?</span>
            <i><em style={{ width: `${Math.round((discoveredHiddenCardIds.length / hiddenCards.length) * 100)}%` }} /></i>
          </button>
          <button className={`archive-hub-card archive-hub-evidence evidence-tier-${evidenceReward.tier}`} onClick={() => openArchive("evidence")}>
            <span className="archive-hub-meta"><small>현장 증거</small><b>{evidenceRecords.length}장</b></span>
            <strong>별가루 증거 도감</strong>
            <span className="archive-hub-symbol" aria-hidden="true">✦</span>
            <span className="archive-hub-caption">{evidenceReward.title}</span>
            <i><em style={{ width: `${evidenceProgress}%` }} /></i>
          </button>
        </div>
      </section>
    </>
  );

  if (archiveView === "hidden") return (
    <>
      <Header title="히든 상호작용 카드" onBack={closeArchive} />
      <section className="screen-content hidden-archive-screen">
        <BureauCode status={`${discoveredHiddenCardIds.length} / ${hiddenCards.length} 발견`}>비정규 상호작용 보관록 · SECRET COMMAND</BureauCode>
        <p className="hidden-archive-intro">평범하게 두드리는 대신 특별한 손동작으로 왁뿌볼을 깨면 발견돼요.</p>
        <section className="hidden-card-archive" aria-labelledby="hidden-card-title">
          <div className="hidden-card-head"><span><small>비정규 신호 보관함</small><strong id="hidden-card-title">히든 상호작용 카드</strong></span><b>{discoveredHiddenCardIds.length} / {hiddenCards.length}</b></div>
          <div className="hidden-card-grid">
            {hiddenCards.map((card) => {
              const discovered = discoveredHiddenCardIds.includes(card.id);
              return <article key={card.id} className={discovered ? "is-discovered" : "is-locked"} aria-label={`${card.title}, ${discovered ? "발견 완료" : "미발견"}`}><span aria-hidden="true">{discovered ? card.symbol : "?"}</span><small>{card.code} · {discovered ? card.label : "SIGNAL UNKNOWN"}</small><strong>{card.title}</strong><p>{discovered ? card.copy : card.hint}</p></article>;
            })}
          </div>
        </section>
      </section>
    </>
  );

  if (archiveView === "evidence") return (
    <>
      <Header title="별가루 증거 도감" onBack={closeArchive} />
      <section className="screen-content evidence-archive-screen">
        <BureauCode status={`${evidenceRecords.length}장 확보`}>현장 증거 보관록 · FIELD EVIDENCE</BureauCode>
        <div className={`evidence-progress-card evidence-tier-${evidenceReward.tier}`}>
          <span className="evidence-progress-icon">✦</span>
          <span><small>현장 증거 보상</small><strong>{evidenceReward.title}</strong><em>별가루 {evidenceRecords.length}개</em></span>
          <b>{evidenceReward.next ? `${evidenceReward.next.title}까지 ${evidenceReward.next.count - evidenceRecords.length}장` : "최고 칭호 달성"}</b>
          <i><em style={{ width: `${evidenceProgress}%` }} /></i>
        </div>
        <div className="evidence-catalog-grid">
          {evidenceRecords.map((record) => {
            const fortune = fortuneFor(record.fortuneId);
            return <button key={record.id} onClick={() => onOpen(record.fortuneId)}><span className="evidence-catalog-photo"><img src={record.photoDataUrl} alt={`${record.title} 현장 증거`} /></span><small>{record.date} · {record.time}</small><strong>{record.title}</strong><span>✦ 현장 증거 확보</span><i><FortuneObject kind={fortune.asset} characterArt={fortune.characterArt} compact /></i></button>;
          })}
          {!evidenceRecords.length && <div className="empty-state compact"><Mascot/><strong>아직 확보한 현장 증거가 없어요.</strong><small>분류 결정 후 카드에 사진을 붙여보세요.</small></div>}
        </div>
      </section>
    </>
  );

  return (
    <>
      <Header title="별일 운세 도감" onBack={closeArchive} right={<button className="icon-button" onClick={() => { if (searchOpen) { setPage(1); onSearch(""); } onSearchOpen(); }} aria-label={searchOpen ? "도감 검색 닫기" : "도감 검색"}><Icon name="search" /></button>} />
      <section className="screen-content collection-screen">
        <BureauCode status={`${completion}% 복원`}>관측 카드 보관록 · FORTUNE ARCHIVE</BureauCode>
        <div className="collection-section-title"><span><small>관측 카드 보관록</small><strong>별일 운세 도감</strong></span><b>{observedFortuneIds.length} / {catalog.length}</b></div>
        {searchOpen && <label className="search-field"><Icon name="search"/><input value={search} onChange={(event) => { setPage(1); onSearch(event.target.value); }} placeholder="별일을 검색해보세요"/></label>}
        <div className="collection-status-row" role="group" aria-label="도감 수집 상태 필터">
          {([ ["all", "전체"], ["observed", "관측 완료"], ["locked", "미관측"] ] as const).map(([key, label]) => <button key={key} className={status === key ? "active" : ""} onClick={() => { setPage(1); setStatus(key); }}>{label}</button>)}
        </div>
        <div className="collection-catalog-grid">
          {visibleFortunes.map((fortune) => {
            const observed = observedIds.has(fortune.id);
            const hasEvidence = evidenceIds.has(fortune.id);
            return (
              <button
                className={`collection-catalog-card ${observed ? "is-observed" : "is-locked"} ${hasEvidence ? "has-evidence" : ""}`}
                key={fortune.id}
                disabled={!observed}
                onClick={() => onOpen(fortune.id)}
                aria-label={observed ? `${fortune.cardTitle}, 관측 완료` : `NO.${String(fortune.id).padStart(3, "0")}, 아직 미관측`}
              >
                <span className="catalog-number">NO.{String(fortune.id).padStart(3, "0")}</span>
                {hasEvidence && <span className="catalog-evidence-badge" aria-label="현장 증거 확보">✦</span>}
                <span className="catalog-art"><FortuneObject kind={fortune.asset} characterArt={fortune.characterArt} /></span>
                <strong>{observed ? fortune.cardTitle : "신호 미수신"}</strong>
                <small>{observed ? "관측 완료" : "SIGNAL LOST"}</small>
              </button>
            );
          })}
          {!filtered.length && <div className="empty-state collection-empty"><Mascot/><strong>조건에 맞는 별일이 없어요.</strong></div>}
        </div>
        <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} showSinglePage />
      </section>
    </>
  );
}

const signalGrades = [
  { label: "혼함", tone: "gray" },
  { label: "꽤 괜찮음", tone: "green" },
  { label: "이왜진", tone: "violet" },
  { label: "오늘 좀 됨", tone: "yellow" },
  { label: "우주 개입", tone: "blue" },
] as const;

function SignalSpectrum({ counts }: { counts: Record<string, number> }) {
  return (
    <ol className="signal-spectrum" aria-label="우주 개입 농도 분포">
      {signalGrades.map((item, index) => {
        const count = counts[item.label] ?? 0;
        return <li className={count ? "has-signal" : ""} data-tone={item.tone} key={item.label}><span><strong>{count}</strong><i aria-hidden="true">{index + 1}</i></span><small>{item.label}</small></li>;
      })}
    </ol>
  );
}

function RecordsScreen({ records, selectedMonth, onMonth, onReport, onOpen }: { records: RecordItem[]; selectedMonth: string; onMonth: (value: string) => void; onReport: () => void; onOpen: (record: RecordItem) => void }) {
  const [page, setPage] = useState(1);
  const monthRecords = records.filter((record) => record.date.startsWith(selectedMonth));
  const totalPages = Math.max(1, Math.ceil(monthRecords.length / recordsPageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = monthRecords.slice((currentPage - 1) * recordsPageSize, currentPage * recordsPageSize);
  const currentMonth = monthKey();
  const reportMonth = Number(selectedMonth.slice(5));
  const exactCount = monthRecords.filter((record) => record.outcome === "happened").length;
  const evidenceCount = monthRecords.filter((record) => record.photoDataUrl).length;
  const strongestStars = monthRecords.reduce((strongest, record) => Math.max(strongest, gradeFor(record).stars), 0);
  const gradeCounts = gradeGuide.reduce<Record<string, number>>((counts, item) => {
    counts[item.grade] = monthRecords.filter((record) => gradeFor(record).grade === item.grade).length;
    return counts;
  }, {});
  return (
    <>
      <Header title="관측 일지" />
      <section className="screen-content records-screen">
        <BureauCode status={`${monthRecords.length}건 포착`}>일일 관측 기록 · DAILY LOG</BureauCode>
        <div className="month-switcher">
          <button onClick={() => { setPage(1); onMonth(shiftMonth(selectedMonth, -1)); }} aria-label="이전 달"><Icon name="back" /></button>
          <span className="month-switcher-label"><strong>{monthLabel(selectedMonth)}</strong>{selectedMonth !== currentMonth && <button className="month-today-button" onClick={() => { setPage(1); onMonth(currentMonth); }}>오늘로 돌아가기</button>}</span>
          <button onClick={() => { setPage(1); onMonth(shiftMonth(selectedMonth, 1)); }} aria-label="다음 달"><Icon name="chevron-right" /></button>
        </div>
        <article className="records-brief">
          <div className="records-brief-head"><span><small>MONTHLY SIGNAL REPORT</small><strong>월간 우주 개입 보고서</strong></span><button onClick={onReport}>자세히 보기 <Icon name="chevron-right"/></button></div>
          <div className="records-brief-copy"><small>관측국 한 줄 판정</small><h2>{monthRecords.length ? <>{reportMonth}월에는 별일이 {monthRecords.length}번.<br/>{exactCount ? `${exactCount}번은 예보와 정확히 겹쳤습니다.` : "정확 관측은 다음 기회로 미뤘습니다."}</> : <>아직 포착된 신호가 없습니다.<br/>우주는 잠시 조용합니다.</>}</h2><MonthlyMascot month={reportMonth} className="records-brief-mascot" /></div>
          <dl className="records-brief-metrics"><div><dt>정확 관측</dt><dd>{exactCount}</dd></div><div><dt>최고 개입도</dt><dd>{strongestStars}<small>단계</small></dd></div><div><dt>현장 증거</dt><dd>{evidenceCount}</dd></div></dl>
          <div className="records-signal-head"><strong>관측 신호 농도</strong><small>일상적 <i/> 극적인 별일</small></div>
          <SignalSpectrum counts={gradeCounts} />
        </article>
        <h2>{reportMonth}월 관측 기록 <small>{monthRecords.length}건</small></h2>
        <div className="record-list">
          {visibleRecords.map((record) => { const fortune = fortuneFor(record.fortuneId); const grade = gradeFor(record); return <button key={record.id} onClick={() => onOpen(record)}><span className="record-thumb"><FortuneObject kind={fortune.asset} characterArt={fortune.characterArt} compact /></span><span><strong>{record.title}{record.photoDataUrl && <i className="record-evidence-mark" aria-label="현장 증거 확보">✦</i>}</strong><small>{record.time} · {record.category}</small></span><em className={`grade-badge tone-${grade.tone}`}>{grade.grade}</em></button>; })}
          {!monthRecords.length && <div className="empty-state compact"><Mascot/><strong>이 달의 기록이 아직 없어요.</strong></div>}
        </div>
        <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} />
      </section>
    </>
  );
}

function ReportScreen({ records, month, onBack, onMonth }: { records: RecordItem[]; month: string; onBack: () => void; onMonth: (value: string) => void }) {
  const reportMonth = Number(month.slice(5));
  const monthRecords = records.filter((record) => record.date.startsWith(month));
  const gradeCounts = gradeGuide.reduce<Record<string, number>>((result, item) => {
    result[item.grade] = monthRecords.filter((record) => gradeFor(record).grade === item.grade).length;
    return result;
  }, {});
  const occurrenceCounts = monthRecords.reduce<Record<string, { id: number; title: string; count: number }>>((result, record) => {
    const key = String(record.fortuneId);
    result[key] = result[key] ? { ...result[key], count: result[key].count + 1 } : { id: record.fortuneId, title: record.title, count: 1 };
    return result;
  }, {});
  const top = Object.values(occurrenceCounts).sort((a, b) => b.count - a.count || a.id - b.id).slice(0, 3);
  const strongestStars = monthRecords.reduce((strongest, record) => Math.max(strongest, gradeFor(record).stars), 0);
  return (
    <>
      <Header title="월간 우주 개입 보고서" onBack={onBack} />
      <section className="screen-content report-screen">
        <BureauCode status={`${monthRecords.length}건 분석`}>월간 관측 브리핑 · MONTHLY BRIEF</BureauCode>
        <div className="month-switcher"><button onClick={() => onMonth(shiftMonth(month, -1))} aria-label="이전 달"><Icon name="back" /></button><strong>{monthLabel(month)}</strong><button onClick={() => onMonth(shiftMonth(month, 1))} aria-label="다음 달"><Icon name="chevron-right" /></button></div>
        <div className="report-hero" data-theme-month={reportMonth}><small>관측 결론</small><h2>{monthRecords.length ? <>대단한 우주 개입은 없었습니다.<br/>그래도 몇 번 피식했습니다.</> : <>아직 포착된 신호가 없습니다.<br/>우주는 잠시 조용합니다.</>}</h2><MonthlyMascot month={reportMonth} className="report-mascot" /></div>
        <div className="report-metrics"><span><small>포착 신호</small><strong>{monthRecords.length}<em>건</em></strong></span><span><small>최고 개입도</small><strong>{strongestStars}<em>단계</em></strong></span><span><small>관측 상태</small><strong className="report-online">정상</strong></span></div>
        <h3>우주 개입 농도 분포</h3>
        <div className="report-signal-panel"><div><small>1단계</small><strong>일상적인 별일</strong></div><div><small>5단계</small><strong>우주가 도운 별일</strong></div><SignalSpectrum counts={gradeCounts}/></div>
        <h3>이번 달 하찮은 수상작 TOP 3</h3>
        {top.length ? <ol className="top-list">{top.map((item, index) => <li key={item.id}><b>{index + 1}</b><span>{item.title}</span><strong>{item.count}회</strong></li>)}</ol> : <div className="empty-state compact"><Mascot/><strong>이 달의 수상 후보가 아직 없어요.</strong></div>}
      </section>
    </>
  );
}

function ExamplesScreen({ onBack }: { onBack: () => void }) {
  const [selectedExhibitId, setSelectedExhibitId] = useState<number | null>(null);
  const exhibitNotes: Record<number, string> = {
    99: "필요한 바로 그 순간, 가장 가까운 곳에서 발견된 공로",
    96: "충전선과 의자 바퀴 사이의 평화를 지켜낸 공로",
    100: "치즈와의 불필요한 줄다리기를 예방한 공로",
  };
  const exhibits = [99, 96, 100].flatMap((id) => {
    const fortune = fortunes.find((item) => item.id === id);
    if (!fortune) return [];
    const record = { fortuneId: fortune.id, title: fortune.cardTitle, outcome: "happened" as const };
    return [{ fortune, award: awardTitle(record), grade: gradeFor(record), note: exhibitNotes[id] }];
  });
  const selectedExhibit = exhibits.find(({ fortune }) => fortune.id === selectedExhibitId) ?? null;

  return (
    <>
      <Header title="하찮은 수상작" onBack={onBack}/>
      <section className="screen-content examples-screen">
        <BureauCode status={`${exhibits.length}점 전시`}>별일 시상위원회 · AWARD HALL</BureauCode>
        <div className="award-hall-stage">
          <header className="award-hall-intro">
            <small>PERMANENT COLLECTION</small>
            <h2>별일 아닌 순간들의<br/>명예로운 전시</h2>
            <p>실제로 일어난 관측 중 별 4단계 이상만 이곳에 걸립니다.</p>
          </header>
          <div className="award-gallery">
            {exhibits.map(({ fortune, award, grade, note }, index) => (
              <article className={`award-exhibit ${index === 0 ? "is-featured" : ""}`} key={fortune.id}>
                <button className="award-exhibit-trigger" type="button" onClick={() => setSelectedExhibitId(fortune.id)} aria-haspopup="dialog">
                  <div className="award-frame">
                    <span>{index === 0 ? "이달의 대표작" : "위원회 소장작"}</span>
                    <FortuneObject kind={fortune.asset} characterArt={fortune.characterArt}/>
                    <small>NO.{String(fortune.id).padStart(3, "0")}</small>
                  </div>
                  <div className="award-plaque">
                    <span className="award-name">{award}</span>
                    <h2>{fortune.cardTitle}</h2>
                    <div className="award-grade"><Stars count={grade.stars} small/><b>{grade.grade}</b></div>
                    <p>{note}</p>
                    <span className="award-open-label">작품 설명 보기 <Icon name="chevron-right"/></span>
                  </div>
                </button>
              </article>
            ))}
          </div>
          <p className="award-hall-footnote">※ 같은 별일도 관측 결과가 다르면 수상하지 않을 수 있어요.</p>
        </div>
        {selectedExhibit ? (
          <div className="award-detail-backdrop" role="presentation">
            <section className="award-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="award-detail-title">
              <button className="award-detail-close" type="button" onClick={() => setSelectedExhibitId(null)} aria-label="작품 설명 닫기">×</button>
              <small>AWARD NOTE · NO.{String(selectedExhibit.fortune.id).padStart(3, "0")}</small>
              <span className="award-name">{selectedExhibit.award}</span>
              <h2 id="award-detail-title">{selectedExhibit.fortune.cardTitle}</h2>
              <div className="award-detail-grade"><Stars count={selectedExhibit.grade.stars}/><strong>{selectedExhibit.grade.grade}</strong></div>
              <p>{selectedExhibit.fortune.copy}</p>
              <dl><dt>선정 이유</dt><dd>{selectedExhibit.note}</dd><dt>수상 기준</dt><dd>실제로 일어난 관측 중 우주 개입 농도 별 4단계 이상</dd></dl>
            </section>
          </div>
        ) : null}
      </section>
    </>
  );
}

function GuideScreen({ onBack }: { onBack: () => void }) {
  return <><Header title="우주 개입 농도 안내" onBack={onBack}/><section className="screen-content guide-screen"><BureauCode status="기준 유효">관측 판정 기준 · SIGNAL SCALE</BureauCode><p>관측된 별일에 우주가 얼마나 쓸데없이 개입했는지 계산해요.</p>{gradeGuide.map((item, index) => <article key={item.grade}><OutcomeFace outcome={index === 0 ? "missed" : index === 1 ? "close" : "happened"}/><div><strong>{item.grade}</strong><span>(별 {item.stars}개)</span><p>{item.copy}</p></div></article>)}</section></>;
}

const observationProfiles: Record<Category, { title: string; copy: string }> = {
  "교통": { title: "절묘한 이동운 포착자", copy: "오가는 길의 미세한 타이밍을 잘 발견해요." },
  "음식": { title: "간식 신호 전문 관측자", copy: "먹는 순간 찾아오는 작은 행운에 민감해요." },
  "사람": { title: "인간관계 우연 포착자", copy: "사람 사이에서 생기는 반가운 신호를 잘 찾아요." },
  "일상": { title: "생활밀착형 행운 포착자", copy: "가까운 곳의 우주 개입을 잘 발견해요." },
  "기타": { title: "미분류 신호 탐색자", copy: "아직 이름 붙지 않은 별일까지 놓치지 않아요." },
};

type ObservationMetric = "all" | "happened" | "awards";

function AboutScreen({ records, onRecords, onOpenRecord, onExamples, onSettings }: { records: RecordItem[]; onRecords: () => void; onOpenRecord: (record: RecordItem) => void; onExamples: () => void; onSettings: () => void }) {
  const [selectedMetric, setSelectedMetric] = useState<ObservationMetric | null>(null);
  const monthRecords = records.filter((record) => record.date.startsWith(monthKey()));
  const categoryCounts = monthRecords.reduce<Record<Category, number>>((counts, record) => {
    counts[record.category] += 1;
    return counts;
  }, { "교통": 0, "음식": 0, "사람": 0, "일상": 0, "기타": 0 });
  const leadingCategory = categories.reduce((leading, category) => categoryCounts[category] > categoryCounts[leading] ? category : leading, "일상");
  const profile = observationProfiles[leadingCategory];
  const happenedCount = records.filter((record) => record.outcome === "happened").length;
  const awardCount = records.filter((record) => gradeFor(record).stars >= 4).length;
  const metricCopy = selectedMetric ? {
    all: { title: "누적 관측 기록", empty: "아직 관측한 별일이 없어요." },
    happened: { title: "실제로 발생한 별일", empty: "아직 정확히 발생한 별일이 없어요." },
    awards: { title: "내가 받은 상", empty: "별 4개 이상의 수상 기록을 기다리고 있어요." },
  }[selectedMetric] : null;
  const metricRecords = selectedMetric === "happened"
    ? records.filter((record) => record.outcome === "happened")
    : selectedMetric === "awards"
      ? records.filter((record) => gradeFor(record).stars >= 4)
      : records;

  function toggleMetric(metric: ObservationMetric) {
    setSelectedMetric((current) => current === metric ? null : metric);
  }

  return (
    <><Header title="내 정보"/><section className="screen-content about-screen">
      <BureauCode status="근무 중">관측요원 파일 · CREW FILE</BureauCode>

      <article className="crew-profile-card">
        <span className="crew-profile-copy">
          <small>나의 관측국 <i>✦</i></small>
          <strong>사소한 별일을<br/>놓치지 않는 중 <i>✦</i></strong>
        </span>
        <span className="crew-profile-mascot" aria-hidden="true"><Mascot/><i/></span>
      </article>

      <div className="about-metrics" role="group" aria-label="나의 관측 통계">
        <button className={selectedMetric === "all" ? "active" : ""} aria-expanded={selectedMetric === "all"} aria-controls="observation-metric-detail" onClick={() => toggleMetric("all")}><span>누적 관측</span><strong>{records.length}</strong><i>기록 보기</i></button>
        <button className={selectedMetric === "happened" ? "active" : ""} aria-expanded={selectedMetric === "happened"} aria-controls="observation-metric-detail" onClick={() => toggleMetric("happened")}><span>실제 발생</span><strong>{happenedCount}</strong><i>기록 보기</i></button>
        <button className={selectedMetric === "awards" ? "active" : ""} aria-expanded={selectedMetric === "awards"} aria-controls="observation-metric-detail" onClick={() => toggleMetric("awards")}><span>받은 상</span><strong>{awardCount}</strong><i>기록 보기</i></button>
      </div>

      {selectedMetric && metricCopy && <section className="observation-metric-detail" id="observation-metric-detail" aria-live="polite">
        <header><span><small>OBSERVATION FILE</small><h2>{metricCopy.title}</h2></span><button onClick={() => setSelectedMetric(null)} aria-label={`${metricCopy.title} 닫기`}>닫기</button></header>
        {metricRecords.length ? <div className="metric-record-list">{metricRecords.slice(0, 4).map((record) => <button key={record.id} onClick={() => onOpenRecord(record)}>
          <span><strong>{record.title}</strong><small>{record.date} · {record.category}</small></span>
          <em>{selectedMetric === "awards" ? awardTitle(record) : outcomeLabels[record.outcome]}</em>
          <Icon name="chevron-right"/>
        </button>)}</div> : <p>{metricCopy.empty}</p>}
        {metricRecords.length > 4 && <button className="metric-more" onClick={onRecords}>나머지 {metricRecords.length - 4}건도 보기 <Icon name="chevron-right"/></button>}
      </section>}

      <article className="observation-profile-card">
        <span>
          <small>이번 달 관측 성향 · MONTHLY TYPE</small>
          <strong>{profile.title}</strong>
          <p>{monthRecords.length ? profile.copy : "첫 관측을 기다리고 있어요."}</p>
        </span>
        <em className="observation-profile-code" aria-hidden="true"><b>{leadingCategory}</b><small>OBSERVED</small></em>
      </article>

      <div className="about-actions">
        <button onClick={onRecords}><span className="about-action-icon action-log" aria-hidden="true"><Icon name="records"/></span><strong>내 관측 기록</strong><Icon name="chevron-right"/></button>
        <button onClick={onExamples}><span className="about-action-icon action-award" aria-hidden="true"><Icon name="award"/></span><strong>받은 상장 {awardCount}개</strong><Icon name="chevron-right"/></button>
        <button onClick={onSettings}><span className="about-action-icon action-settings" aria-hidden="true"><Icon name="manual"/></span><span className="about-action-copy"><strong>앱 안내 및 설정</strong><small>관측 기준 · 저장 방식 · 데이터 관리</small></span><Icon name="chevron-right"/></button>
      </div>
    </section></>
  );
}

function SettingsScreen({ records, onBack, onGuide, onReset, confirming }: { records: RecordItem[]; onBack: () => void; onGuide: () => void; onReset: () => void; confirming: boolean }) {
  const evidenceCount = records.filter((record) => record.photoDataUrl).length;
  return (
    <><Header title="앱 안내 및 설정" onBack={onBack}/><section className="screen-content settings-screen">
      <BureauCode status="기기 저장">관측국 운영 안내 · LOCAL FILE</BureauCode>
      <article className="settings-intro"><span><small>별일 관측국은?</small><h2>아무 일도 아닌 일을<br/>관측하고, 보도하고, 시상합니다.</h2><p>예보를 분류하면 보관소와 관측일지에 기록돼요. 사진 증거를 붙이면 별가루와 전용 칭호를 받을 수 있어요.</p></span><Mascot/></article>

      <section className="settings-section"><header><small>OBSERVATION RULE</small><h2>관측 기준</h2></header><button className="settings-link" onClick={onGuide}><span><strong>우주 개입 농도 안내</strong><small>1–5단계 판정 기준과 별점 확인</small></span><Icon name="chevron-right"/></button></section>

      <section className="settings-section"><header><small>LOCAL STORAGE</small><h2>기록 보관 방식</h2></header><div className="storage-summary"><span className="storage-icon" aria-hidden="true"><i/></span><span><strong>이 기기에만 저장돼요</strong><p>계정이나 서버 없이 현재 기기의 브라우저 저장소를 사용합니다. 앱 데이터나 브라우저 저장소를 지우면 복구할 수 없어요.</p></span></div><dl className="storage-metrics"><div><dt>저장된 관측</dt><dd>{records.length}<small>건</small></dd></div><div><dt>현장 증거</dt><dd>{evidenceCount}<small>장</small></dd></div></dl></section>

      <section className="settings-section settings-data"><header><small>DATA CONTROL</small><h2>데이터 관리</h2></header><p>보관소, 관측일지, 사진 증거와 발견한 카드가 모두 삭제됩니다.</p><button className={confirming ? "danger" : ""} onClick={onReset}>{confirming ? "정말 전체 기록을 삭제할까요?" : "내 기록 전체 초기화"}<span>{confirming ? "한 번 더 누르면 삭제" : `${records.length}건 저장 중`}</span></button></section>

    </section></>
  );
}

export default function Home() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("today");
  const [view, setView] = useState<View>("main");
  const [archiveView, setArchiveView] = useState<ArchiveView>("hub");
  const [fortuneIndex, setFortuneIndex] = useState(dailyFortuneIndex(now));
  const [fortuneRevealed, setFortuneRevealed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [category, setCategory] = useState<Category>("일상");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [discoveredHiddenCardIds, setDiscoveredHiddenCardIds] = useState<HiddenCardId[]>([]);
  const [currentHiddenCardId, setCurrentHiddenCardId] = useState<HiddenCardId | null>(null);
  const [observedWakppu, setObservedWakppu] = useState<WakppuVariant[]>([]);
  const [activeRecord, setActiveRecord] = useState<RecordItem | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(monthKey(now));
  const [toast, setToast] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [wakppuCycle, setWakppuCycle] = useState(0);
  const recordsRef = useRef<RecordItem[]>([]);
  const navigationRef = useRef<ByeolilHistoryState>({ byeolilNavigation: true, depth: 0, tab: "today", view: "main", archiveView: "hub", activeRecordId: null });
  const fortune = fortunes[fortuneIndex];

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    const rootState = navigationRef.current;
    window.history.replaceState(rootState, "");

    function restoreNavigation(state: ByeolilHistoryState) {
      const record = state.activeRecordId
        ? recordsRef.current.find((item) => item.id === state.activeRecordId) ?? null
        : null;
      const safeState = (state.view === "card" || state.view === "capture") && !record
        ? { ...state, view: "main" as View, activeRecordId: null }
        : state;
      navigationRef.current = safeState;
      setTab(safeState.tab);
      setView(safeState.view);
      setArchiveView(safeState.archiveView);
      setActiveRecord(record);
      setConfirmDelete(false);
      if (safeState.archiveView === "hub") {
        setSearchOpen(false);
        setSearch("");
      }
      if (record) setCurrentRecordId(record.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function onPopState(event: PopStateEvent) {
      const state = event.state as Partial<ByeolilHistoryState> | null;
      if (state?.byeolilNavigation && typeof state.depth === "number" && state.tab && state.view && state.archiveView) {
        restoreNavigation(state as ByeolilHistoryState);
        return;
      }
      restoreNavigation(rootState);
    }

    window.addEventListener("popstate", onPopState);
    const removeBackEvent = graniteEvent.addEventListener("backEvent", {
      onEvent: () => {
        if (navigationRef.current.depth > 0) {
          window.history.back();
          return;
        }
        void closeView().catch(() => window.history.back());
      },
    });
    void Screen.setIosSwipeBack({ isEnabled: true }).catch(() => undefined);

    return () => {
      window.removeEventListener("popstate", onPopState);
      removeBackEvent();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loadedRecords = loadRecords();
      setRecords(loadedRecords);
      setDiscoveredHiddenCardIds(loadHiddenCards());
      const storedWakppu = loadObservedWakppu();
      const visibleWakppu = [...new Set([
        ...storedWakppu.filter((variant) => variant !== "blackHole"),
        ...loadedRecords.map((record) => wakppuVariantFor(record.fortuneId, false)),
      ])];
      const blackHoleUnlocked = visibleWakppu.length >= blackHoleUnlockCount;
      const migratedWakppu = [...new Set([
        ...visibleWakppu,
        ...(blackHoleUnlocked ? storedWakppu.filter((variant) => variant === "blackHole") : []),
        ...(blackHoleUnlocked ? loadedRecords.map((record) => wakppuVariantFor(record.fortuneId, true)).filter((variant) => variant === "blackHole") : []),
      ])];
      setObservedWakppu(migratedWakppu);
      saveObservedWakppu(migratedWakppu);
      const initialFortune = fortunes[dailyFortuneIndex()];
      const todayRecord = loadedRecords.find((record) => record.date === localDateKey() && record.fortuneId === initialFortune.id);
      setCurrentRecordId(todayRecord?.id ?? null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const mainVisible = view === "main";
  const observedFortuneIds = useMemo(() => [...new Set(records.map((record) => record.fortuneId))], [records]);
  const evidenceCount = records.filter((record) => record.photoDataUrl).length;
  const currentRecord = currentRecordId ? records.find((record) => record.id === currentRecordId) : undefined;
  const observedVisibleWakppuCount = observedWakppu.filter((variant) => variant !== "blackHole").length;
  const blackHoleUnlocked = observedVisibleWakppuCount >= blackHoleUnlockCount;
  const baseWakppuVariant = wakppuVariantFor(fortune.id, blackHoleUnlocked);
  const availableWakppuVariants = wakppuCatalog.map((item) => item.id).filter((variant) => variant !== "blackHole" || blackHoleUnlocked);
  const baseWakppuIndex = Math.max(0, availableWakppuVariants.indexOf(baseWakppuVariant));
  const currentWakppuVariant = availableWakppuVariants[(baseWakppuIndex + wakppuCycle) % availableWakppuVariants.length];

  function persist(next: RecordItem[], photoFallback?: RecordItem[]) {
    const result = saveRecords(next, photoFallback);
    if (result.saved) {
      recordsRef.current = result.records;
      setRecords(result.records);
    }
    else setToast("기기 저장소에 기록하지 못했어요");
    return result;
  }

  function navigate(next: Partial<Omit<ByeolilHistoryState, "byeolilNavigation" | "depth">>, mode: "push" | "replace" | "root" = "push") {
    const current = navigationRef.current;
    const target: ByeolilHistoryState = {
      ...current,
      ...next,
      byeolilNavigation: true,
      depth: mode === "root" ? 0 : mode === "replace" ? current.depth : current.depth + 1,
    };
    navigationRef.current = target;
    if (mode === "push") window.history.pushState(target, "");
    else window.history.replaceState(target, "");
    setTab(target.tab);
    setView(target.view);
    setArchiveView(target.archiveView);
    setActiveRecord(target.activeRecordId ? recordsRef.current.find((record) => record.id === target.activeRecordId) ?? null : null);
    setConfirmDelete(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (navigationRef.current.depth > 0) window.history.back();
    else void closeView().catch(() => window.history.back());
  }

  function moveTab(next: Tab) {
    setFortuneRevealed(false);
    setOutcome(null);
    setCurrentHiddenCardId(null);
    setNote("");
    setPhoto(null);
    if (next === "today") {
      const todayRecord = records.find((record) => record.date === localDateKey() && record.fortuneId === fortune.id);
      setCurrentRecordId(todayRecord?.id ?? null);
      setCategory(fortune.category);
    }
    navigate({ tab: next, view: "main", archiveView: "hub", activeRecordId: null }, "root");
  }

  function openCard(record: RecordItem) {
    navigate({ view: "card", activeRecordId: record.id });
  }

  function openCollectedFortune(fortuneId: number) {
    const record = records.find((item) => item.fortuneId === fortuneId);
    if (record) { openCard(record); return; }
    setToast("도감 등록 완료 · 관측 기록은 아직 없어요");
  }

  function confirmClassification() {
    if (!outcome) {
      setToast("먼저 카드를 분류해주세요");
      return;
    }
    if (currentHiddenCardId) {
      const nextHiddenCards = discoveredHiddenCardIds.includes(currentHiddenCardId)
        ? discoveredHiddenCardIds
        : [...discoveredHiddenCardIds, currentHiddenCardId];
      if (!saveHiddenCards(nextHiddenCards)) {
        setToast("히든 카드 발견 상태를 저장하지 못했어요");
        return;
      }
      setDiscoveredHiddenCardIds(nextHiddenCards);
      setCurrentRecordId(null);
      navigate({ tab: "collection", view: "hidden-card", archiveView: "hub", activeRecordId: null });
      setToast("분류 결정 · 히든 카드만 비밀 보관함에 등록했어요");
      return;
    }
    const existing = currentRecordId ? records.find((record) => record.id === currentRecordId) : undefined;
    const created = new Date();
    const record: RecordItem = existing
      ? { ...existing, outcome }
      : {
          id: `${created.getTime()}-${fortune.id}`,
          date: localDateKey(created),
          time: localTimeLabel(created),
          fortuneId: fortune.id,
          title: fortune.cardTitle,
          outcome,
          category: fortune.category,
          note: "",
        };
    const next = existing
      ? records.map((item) => item.id === existing.id ? record : item)
      : [record, ...records];
    const persisted = persist(next);
    if (!persisted.saved) return;
    const savedRecord = persisted.records.find((item) => item.id === record.id) ?? record;
    setCurrentRecordId(savedRecord.id);
    navigate({ tab: "collection", view: "card", archiveView: "hub", activeRecordId: savedRecord.id });
    setToast(existing ? "재분류 완료 · 도감에 반영했어요" : "분류 결정 · 도감과 관측일지에 등록했어요");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEvidence(record: RecordItem) {
    setCurrentRecordId(record.id);
    setOutcome(record.outcome);
    setCategory(record.category);
    setNote(record.note);
    setPhoto(record.photoDataUrl ?? null);
    navigate({ view: "capture", activeRecordId: record.id });
  }

  function encounterHiddenCard(id: HiddenCardId) {
    setCurrentHiddenCardId(id);
    setToast(`${hiddenCardFor(id).title} 출현 · 분류 결정을 눌러 등록하세요`);
  }

  function observeWakppu(variant: WakppuVariant) {
    setObservedWakppu((current) => {
      if (current.includes(variant)) return current;
      if (variant === "blackHole" && current.filter((item) => item !== "blackHole").length < blackHoleUnlockCount) return current;
      const next = [...current, variant];
      if (!saveObservedWakppu(next)) {
        setToast("천체 관측 상태를 저장하지 못했어요");
        return current;
      }
      const item = wakppuCatalog.find((candidate) => candidate.id === variant);
      setToast(`${item?.name ?? "왁뿌볼"} 관측 완료 · 천체도감 등록`);
      return next;
    });
  }

  function selectFortuneOutcome(nextOutcome: Outcome) {
    setOutcome(nextOutcome);
    setToast("분류함 선택 완료 · 결정 버튼을 눌러주세요");
    return true;
  }

  function cycleWakppu() {
    setWakppuCycle((cycle) => cycle + 1);
    setFortuneRevealed(false);
    setOutcome(null);
    setCurrentHiddenCardId(null);
    setNote("");
    setPhoto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function drawNewFortune() {
    const nextIndex = (fortuneIndex + 1) % fortunes.length;
    const nextFortune = fortunes[nextIndex];
    const todayRecord = records.find((record) => record.date === localDateKey() && record.fortuneId === nextFortune.id);
    setCurrentRecordId(todayRecord?.id ?? null); setFortuneIndex(nextIndex); setWakppuCycle(0); setFortuneRevealed(false); setOutcome(null); setCurrentHiddenCardId(null); setCategory(nextFortune.category); setNote(""); setPhoto(null); navigate({ tab: "today", view: "main", archiveView: "hub", activeRecordId: null }, "root");
  }

  async function selectPhoto(file: File) {
    try {
      setPhoto(await optimizePhoto(file));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "사진을 불러오지 못했어요");
    }
  }

  function saveRecord() {
    if (!outcome) { setToast("먼저 관측 결과를 분류해주세요"); return; }
    const existing = currentRecordId ? records.find((record) => record.id === currentRecordId) : undefined;
    const earnedEvidence = Boolean(photo && !existing?.photoDataUrl);
    const created = new Date();
    const record: RecordItem = existing ? { ...existing, outcome, category, note: note.trim(), photoDataUrl: photo ?? undefined } : { id: `${created.getTime()}-${fortune.id}`, date: localDateKey(created), time: localTimeLabel(created), fortuneId: fortune.id, title: fortune.cardTitle, outcome, category, note: note.trim(), photoDataUrl: photo ?? undefined };
    setCurrentRecordId(record.id);
    const next = existing ? records.map((item) => item.id === record.id ? record : item) : [record, ...records];
    const fallbackRecord = { ...record, photoDataUrl: existing?.photoDataUrl };
    const photoFallback = existing
      ? records.map((item) => item.id === record.id ? fallbackRecord : item)
      : [fallbackRecord, ...records];
    const persisted = persist(next, photo ? photoFallback : undefined);
    if (!persisted.saved) return;
    const savedRecord = persisted.records.find((item) => item.id === record.id) ?? record;
    navigate({ view: "card", activeRecordId: savedRecord.id }, "replace");
    if (earnedEvidence && persisted.photosSaved) setToast("현장 증거 확보 · 별가루 +1");
    else if (photo && persisted.photosSaved) setToast("현장 증거를 갱신했어요");
    else if (photo) setToast("저장 공간이 부족해 사진 빼고 기록했어요");
    else setToast("관측기록 보강 완료 · 보관소에 저장했어요");
  }

  async function shareRecord() {
    if (!activeRecord) return;
    const text = `${archiveTypeFor(activeRecord).label} NO.${String(activeRecord.fortuneId).padStart(3, "0")} · ${activeRecord.title} · ${gradeFor(activeRecord).grade}`;
    try {
      if (navigator.share) await navigator.share({ title: "별일", text });
      else { await navigator.clipboard.writeText(text); setToast("카드 문구를 복사했어요"); }
    } catch { /* share sheet dismissed */ }
  }

  function deleteRecord() {
    if (!activeRecord) return;
    if (!confirmDelete) { setConfirmDelete(true); setToast("한 번 더 누르면 카드가 삭제돼요"); return; }
    const remaining = records.filter((record) => record.id !== activeRecord.id);
    if (!persist(remaining).saved) return;
    if (currentRecordId === activeRecord.id) setCurrentRecordId(null);
    navigate({ tab: "collection", view: "main", archiveView: "hub", activeRecordId: null }, "root"); setToast("카드를 삭제했어요");
  }

  function resetRecords() {
    if (!confirmReset) { setConfirmReset(true); return; }
    if (!clearRecords()) { setToast("기록을 초기화하지 못했어요"); return; }
    setRecords([]); setDiscoveredHiddenCardIds([]); setCurrentHiddenCardId(null); setObservedWakppu([]); setCurrentRecordId(null); setActiveRecord(null); setFortuneRevealed(false); setOutcome(null); setNote(""); setPhoto(null); setConfirmReset(false); setToast("내 기록과 도감을 모두 지웠어요");
  }

  return (
    <main className="app-shell">
      <div className="phone-surface">
        {view === "capture" && currentRecord && <CaptureScreen record={currentRecord} evidenceCount={evidenceCount} category={category} note={note} photo={photo} onBack={goBack} onCategory={setCategory} onNote={setNote} onPhoto={selectPhoto} onSave={saveRecord} onSkip={() => navigate({ view: "card", activeRecordId: currentRecord.id }, "replace")} />}
        {view === "card" && activeRecord && <CardScreen record={activeRecord} evidenceCount={evidenceCount} occurrenceCount={records.filter((record) => record.fortuneId === activeRecord.fortuneId).length} onBack={goBack} onShare={shareRecord} onCollection={() => moveTab("collection")} onReplay={() => moveTab("today")} onDelete={deleteRecord} onEvidence={() => openEvidence(activeRecord)} />}
        {view === "hidden-card" && currentHiddenCardId && <HiddenCardResultScreen cardId={currentHiddenCardId} onBack={goBack} onCollection={() => navigate({ tab: "collection", view: "main", archiveView: "hidden", activeRecordId: null }, "replace")} onReplay={drawNewFortune} />}
        {view === "report" && <ReportScreen records={records} month={selectedMonth} onBack={goBack} onMonth={setSelectedMonth} />}
        {view === "examples" && <ExamplesScreen onBack={goBack} />}
        {view === "guide" && <GuideScreen onBack={goBack} />}
        {view === "settings" && <SettingsScreen records={records} onBack={goBack} onGuide={() => navigate({ view: "guide", activeRecordId: null })} onReset={resetRecords} confirming={confirmReset} />}
        {view === "wakppu" && <WakppuCatalogScreen observed={observedWakppu} onBack={goBack} />}
        {mainVisible && tab === "today" && <TodayScreen key={`${fortuneIndex}-${currentWakppuVariant}`} fortuneIndex={fortuneIndex} wakppuVariant={currentWakppuVariant} revealed={fortuneRevealed} outcome={outcome} hiddenCardId={currentHiddenCardId} onOutcome={selectFortuneOutcome} onRecall={() => setOutcome(null)} onCycleWakppu={cycleWakppu} onNewFortune={drawNewFortune} onHiddenCardDiscover={encounterHiddenCard} onReveal={() => { setFortuneRevealed(true); observeWakppu(currentWakppuVariant); }} onConfirm={confirmClassification} classificationConfirmed={!currentHiddenCardId && Boolean(currentRecord && outcome === currentRecord.outcome)} onCapture={() => currentHiddenCardId ? setToast("히든 카드는 분류 결정 후 비밀 보관함에서 확인해주세요") : currentRecord ? openEvidence(currentRecord) : setToast("먼저 분류를 결정해주세요")} onAbout={() => moveTab("about")} />}
        {mainVisible && tab === "collection" && <CollectionScreen observedFortuneIds={observedFortuneIds} observedWakppu={observedWakppu} discoveredHiddenCardIds={discoveredHiddenCardIds} records={records} searchOpen={searchOpen} search={search} archiveView={archiveView} onSearchOpen={() => setSearchOpen((value) => !value)} onSearch={setSearch} onOpen={openCollectedFortune} onWakppu={() => navigate({ view: "wakppu", activeRecordId: null })} onArchive={(nextArchive) => navigate({ tab: "collection", view: "main", archiveView: nextArchive, activeRecordId: null })} onBack={goBack} />}
        {mainVisible && tab === "records" && <RecordsScreen records={records} selectedMonth={selectedMonth} onMonth={setSelectedMonth} onReport={() => navigate({ view: "report", activeRecordId: null })} onOpen={openCard} />}
        {mainVisible && tab === "about" && <AboutScreen records={records} onRecords={() => moveTab("records")} onOpenRecord={openCard} onExamples={() => navigate({ view: "examples", activeRecordId: null })} onSettings={() => navigate({ view: "settings", activeRecordId: null })} />}
        {mainVisible && <BottomNav tab={tab} onMove={moveTab} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </main>
  );
}
