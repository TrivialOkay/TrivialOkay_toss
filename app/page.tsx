"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  categories,
  dateLabel,
  fortuneFor,
  fortunes,
  gradeFor,
  gradeGuide,
  localDateKey,
  makeSampleRecords,
  monthKey,
  monthLabel,
  outcomeMeta,
  shiftMonth,
  type Category,
  type Outcome,
  type RecordItem,
  type Tab,
  type View,
} from "./byeolil-data";
import { BottomNav, BureauCode, FortuneObject, FortuneScene, Icon, Mascot, OutcomeFace, SpeechBubble, Stars } from "./byeolil-ui";

const FortuneBall = lazy(() => import("./fortune-ball").then((module) => ({ default: module.FortuneBall })));

const storageKey = "byeolil-records-v2";
const legacyStorageKey = "byeolil-records-v1";
const migrationKey = "byeolil-records-v1-migrated";
const sampleCatalogKey = "byeolil-sample-catalog-version";
const sampleCatalogVersion = "2026-08-fortunes-83-lucky-near-misses";
const observedFortunesKey = "byeolil-observed-fortunes-v1";

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

function readStoredRecords(key: string) {
  const stored = window.localStorage.getItem(key);
  if (!stored) return null;
  const parsed = JSON.parse(stored) as Array<Partial<RecordItem>>;
  if (!Array.isArray(parsed)) return null;
  return parsed.filter((item): item is Partial<RecordItem> & Pick<RecordItem, "id" | "date" | "time" | "fortuneId" | "title" | "outcome"> =>
    typeof item.id === "string" &&
    typeof item.date === "string" &&
    typeof item.time === "string" &&
    typeof item.fortuneId === "number" &&
    typeof item.title === "string" &&
    (item.outcome === "happened" || item.outcome === "close" || item.outcome === "missed"),
  ).map((item) => ({
    id: item.id,
    date: item.date,
    time: item.time,
    fortuneId: item.fortuneId,
    title: item.title,
    outcome: item.outcome,
    category: categories.includes(item.category as Category) ? item.category as Category : fortuneFor(item.fortuneId).category,
    note: typeof item.note === "string" ? item.note : "",
    photoDataUrl: typeof item.photoDataUrl === "string" ? item.photoDataUrl : undefined,
    sample: item.sample === true,
  }));
}

function loadRecords() {
  try {
    let current = readStoredRecords(storageKey) ?? makeSampleRecords();

    if (window.localStorage.getItem(migrationKey) !== "done") {
      const legacy = (readStoredRecords(legacyStorageKey) ?? []).filter((record) => !record.sample);
      current = [...legacy, ...current].filter((record, index, records) => records.findIndex((item) => item.id === record.id) === index);
      window.localStorage.setItem(migrationKey, "done");
    }

    if (window.localStorage.getItem(sampleCatalogKey) !== sampleCatalogVersion) {
      current = [...current.filter((record) => !record.sample), ...makeSampleRecords()];
      window.localStorage.setItem(sampleCatalogKey, sampleCatalogVersion);
    }

    window.localStorage.setItem(storageKey, JSON.stringify(current));
    return current;
  } catch {
    return makeSampleRecords();
  }
}

function loadObservedFortuneIds(records: RecordItem[]) {
  try {
    const recordedIds = records.filter((record) => !record.sample).map((record) => record.fortuneId);
    const observedIds = [...new Set(recordedIds)];
    window.localStorage.setItem(observedFortunesKey, JSON.stringify(observedIds));
    return observedIds;
  } catch {
    return records.filter((record) => !record.sample).map((record) => record.fortuneId);
  }
}

function calendarCells(key: string) {
  const [year, month] = key.split("-").map(Number);
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const count = Math.ceil((first + days) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const day = index - first + 1;
    return day > 0 && day <= days ? day : 0;
  });
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

const constellationPoints = [
  { x: 6, y: 31, threshold: 1 },
  { x: 24, y: 17, threshold: 20 },
  { x: 43, y: 27, threshold: 40 },
  { x: 64, y: 10, threshold: 60 },
  { x: 78, y: 28, threshold: 80 },
  { x: 95, y: 15, threshold: 100 },
] as const;

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
  revealed,
  outcome,
  onOutcome,
  onCycle,
  onReveal,
  onCapture,
  onAbout,
}: {
  fortuneIndex: number;
  revealed: boolean;
  outcome: Outcome | null;
  onOutcome: (value: Outcome) => void;
  onCycle: () => void;
  onReveal: () => void;
  onCapture: () => void;
  onAbout: () => void;
}) {
  const fortune = fortunes[fortuneIndex];
  return (
    <>
      <header className="today-header"><div><h1>별일 관측국</h1><small>오늘의 미세한 우주 개입 예보</small><span className="today-signal"><i />관측소 01 · KST · SIGNAL 03%</span></div><button className="icon-button" onClick={onAbout} aria-label="내 정보 열기"><Icon name="settings" /></button></header>
      <section className="screen-content today-screen" aria-labelledby="today-date">
        <div className="today-date-row">
          <div className="date-button" id="today-date">{dateLabel()} <Icon name="chevron-down" /></div>
          <button className="outline-button fortune-refresh" onClick={onCycle}><Icon name="refresh" />다른 운세 보기</button>
        </div>
        <article className={`fortune-card ${revealed ? "is-card-revealed" : ""}`}>
          <div className="fortune-kicker"><span className="crystal-ball" />오늘의 별일 예보<span className={`observation-live ${revealed ? "is-complete" : ""}`}>{revealed ? "관측 완료" : "신호 수신 중"}</span><span className="help-circle">?</span></div>
          <h2>{revealed ? fortune.title : "왁뿌볼 안에 든 운세를 꺼내보세요."}</h2>
          <p>{revealed ? "우주 기여도 3% · 큰 기대는 금물!" : "돌리고, 누르고, 문지르면 예보가 나옵니다."}</p>
          <Suspense fallback={<div className="fortune-ball-loading" role="status">왁뿌볼 불러오는 중...</div>}>
            <FortuneBall key={fortune.id} fortune={fortune.cardTitle} fortuneId={fortune.id} asset={fortune.asset} characterArt={fortune.characterArt} outcome={outcome} onOutcome={onOutcome} onReveal={onReveal} />
          </Suspense>
        </article>
        <section className={`outcome-section ${revealed ? "" : "is-locked"}`} aria-hidden={!revealed}>
          <div className="outcome-sorter-head"><span>OBS SORTER · 03</span><b><i />{outcome ? "도감 등록 완료" : "분류 대기"}</b></div>
          <h2>관측 결과 분류함</h2>
          <p>카드를 실제 결과와 맞는 투입구에 넣어주세요</p>
          <div className="outcome-grid" role="group" aria-label="오늘의 운세 결과">
            {(Object.keys(outcomeMeta) as Outcome[]).map((key) => (
              <button key={key} data-outcome-slot={key} disabled={!revealed} className={`outcome-button outcome-${key} ${outcome === key ? "selected" : ""}`} onClick={() => onOutcome(key)} aria-pressed={outcome === key}>
                <span className="outcome-button-head"><OutcomeFace outcome={key} /><strong>{outcomeLabels[key]}</strong></span>
                <span className="outcome-card-slot" aria-hidden="true"><i /></span>
                <small>{outcome === key ? "분류 완료" : outcomeDescriptions[key]}</small>
              </button>
            ))}
          </div>
        </section>
        <button className="photo-record-button" aria-label="현장 증거 더하기" disabled={!revealed || !outcome} onClick={onCapture}><span className="camera-symbol"><Icon name="camera" /></span><strong>{!revealed ? "예보를 꺼내면 관측할 수 있어요" : outcome ? <>현장 증거 더하기 <small>(사진 선택)</small></> : "카드를 분류하면 기록할 수 있어요"}</strong><Icon name="chevron-right" /></button>
      </section>
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
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => event.target.files?.[0] && onPhoto(event.target.files[0])} />
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

function CardScreen({ record, evidenceCount, onBack, onShare, onCollection, onReplay, onDelete, onEvidence }: { record: RecordItem; evidenceCount: number; onBack: () => void; onShare: () => void; onCollection: () => void; onReplay: () => void; onDelete: () => void; onEvidence: () => void }) {
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
          <dl className="card-stats"><div><dt>발견 날짜</dt><dd>{record.date.replaceAll("-", ".")}</dd></div><div><dt>발견 시간</dt><dd>{record.time}</dd></div><div><dt>별일 횟수</dt><dd>{record.sample ? "3회" : "1회"}</dd></div></dl>
        </article>
        {!record.sample && <button className={`evidence-edit-button ${record.photoDataUrl ? "has-evidence" : ""}`} onClick={onEvidence}><span><Icon name="camera" /></span><strong>{record.photoDataUrl ? "이 카드의 증거 교체하기" : "이 카드에 현장 증거 붙이기"}<small>{record.photoDataUrl ? "별가루는 그대로 유지돼요" : "사진 증거를 붙이면 별가루 +1"}</small></strong><Icon name="chevron-right" /></button>}
        <div className="card-actions"><button className="outline-button" onClick={onReplay}><Icon name="refresh" />다시 보기</button><button className="black-button" onClick={onShare}><Icon name="share" />공유하기</button><button className="outline-button" onClick={onCollection}><span className="tiny-picture"/>도감으로</button></div>
      </section>
    </>
  );
}

type CollectionStatus = "all" | "observed" | "locked";

function CollectionScreen({ observedFortuneIds, records, searchOpen, search, onSearchOpen, onSearch, onOpen }: { observedFortuneIds: number[]; records: RecordItem[]; searchOpen: boolean; search: string; onSearchOpen: () => void; onSearch: (value: string) => void; onOpen: (fortuneId: number) => void }) {
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
  const evidenceRecords = records.filter((record) => !record.sample && record.photoDataUrl);
  const evidenceIds = new Set(evidenceRecords.map((record) => record.fortuneId));
  const evidenceReward = evidenceRewardFor(evidenceRecords.length);
  const evidenceProgress = evidenceReward.next ? Math.round(((evidenceRecords.length - evidenceReward.count) / (evidenceReward.next.count - evidenceReward.count)) * 100) : 100;
  return (
    <>
      <Header title="별일 운세 도감" right={<button className="icon-button" onClick={onSearchOpen} aria-label="도감 검색"><Icon name="search" /></button>} />
      <section className="screen-content collection-screen">
        <BureauCode status={`${completion}% 복원`}>관측 자료 보관 구역 · ARCHIVE 01</BureauCode>
        <div className="collection-progress-card">
          <span><small>별일 관측국 · 수집 기록</small><strong>관측한 운세는 본래의 빛을 되찾아요.</strong></span>
          <b>{observedFortuneIds.length} / {catalog.length}</b>
          <svg className="collection-constellation" viewBox="0 0 100 40" aria-hidden="true">
            <polyline className="constellation-track" points={constellationPoints.map((point) => `${point.x},${point.y}`).join(" ")} pathLength="100" />
            <polyline className="constellation-signal" points={constellationPoints.map((point) => `${point.x},${point.y}`).join(" ")} pathLength="100" style={{ strokeDashoffset: 100 - completion }} />
            {constellationPoints.map((point) => <circle key={point.threshold} className={completion >= point.threshold ? "is-lit" : ""} cx={point.x} cy={point.y} r="1.7" />)}
          </svg>
          <i role="progressbar" aria-label="운세 도감 수집률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><em style={{ width: `${completion}%` }} /></i>
        </div>
        <div className={`evidence-progress-card evidence-tier-${evidenceReward.tier}`}>
          <span className="evidence-progress-icon">✦</span>
          <span><small>현장 증거 보상</small><strong>{evidenceReward.title}</strong><em>별가루 {evidenceRecords.length}개</em></span>
          <b>{evidenceReward.next ? `${evidenceReward.next.title}까지 ${evidenceReward.next.count - evidenceRecords.length}장` : "최고 칭호 달성"}</b>
          <i><em style={{ width: `${evidenceProgress}%` }} /></i>
        </div>
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

function RecordsScreen({ records, selectedMonth, onMonth, onReport, onOpen }: { records: RecordItem[]; selectedMonth: string; onMonth: (value: string) => void; onReport: () => void; onOpen: (record: RecordItem) => void }) {
  const [page, setPage] = useState(1);
  const monthRecords = records.filter((record) => record.date.startsWith(selectedMonth));
  const totalPages = Math.max(1, Math.ceil(monthRecords.length / recordsPageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = monthRecords.slice((currentPage - 1) * recordsPageSize, currentPage * recordsPageSize);
  const cells = calendarCells(selectedMonth);
  const today = localDateKey();
  const currentMonth = monthKey();
  return (
    <>
      <Header title="관측 일지" right={<button className="icon-button" onClick={onReport} aria-label="월간 리포트"><Icon name="chart" /></button>} />
      <section className="screen-content records-screen">
        <BureauCode status={`${monthRecords.length}건 포착`}>일일 관측 기록 · DAILY LOG</BureauCode>
        <div className="month-switcher">
          <button onClick={() => { setPage(1); onMonth(shiftMonth(selectedMonth, -1)); }} aria-label="이전 달"><Icon name="back" /></button>
          <span className="month-switcher-label"><strong>{monthLabel(selectedMonth)}</strong>{selectedMonth !== currentMonth && <button className="month-today-button" onClick={() => { setPage(1); onMonth(currentMonth); }}>오늘로 돌아가기</button>}</span>
          <button onClick={() => { setPage(1); onMonth(shiftMonth(selectedMonth, 1)); }} aria-label="다음 달"><Icon name="chevron-right" /></button>
        </div>
        <div className="calendar"><div className="week-row">{["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { const key = day ? `${selectedMonth}-${String(day).padStart(2, "0")}` : ""; const has = monthRecords.some((record) => record.date === key); return <span key={`${day}-${index}`} className={`${key === today ? "today" : ""} ${has ? "has-record" : ""}`}>{day || ""}</span>; })}</div></div>
        <h2>{Number(selectedMonth.slice(5))}월의 기록</h2>
        <div className="record-list">
          {visibleRecords.map((record) => { const fortune = fortuneFor(record.fortuneId); const grade = gradeFor(record); return <button key={record.id} onClick={() => onOpen(record)}><span className="record-thumb"><FortuneObject kind={fortune.asset} characterArt={fortune.characterArt} compact /></span><span><strong>{record.title}{record.photoDataUrl && <i className="record-evidence-mark" aria-label="현장 증거 확보">✦</i>}</strong><small>{record.time} · {record.category}</small></span><em className={`grade-badge tone-${grade.tone}`}>{grade.grade}</em></button>; })}
          {!monthRecords.length && <div className="empty-state compact"><Mascot/><strong>이 달의 기록이 아직 없어요.</strong></div>}
        </div>
        <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} />
        <button className="month-comment" onClick={onReport}><span><small>관측국 코멘트</small><strong>인생에 큰 영향은 없었지만,<br/>보고서 쓸 정도는 됐습니다.</strong></span><Mascot /></button>
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
  const max = Math.max(1, ...Object.values(gradeCounts));
  const strongestStars = monthRecords.reduce((strongest, record) => Math.max(strongest, gradeFor(record).stars), 0);
  return (
    <>
      <Header title="월간 우주 개입 보고서" onBack={onBack} right={<Icon name="chart" />} />
      <section className="screen-content report-screen">
        <BureauCode status="분석 완료">월간 관측 브리핑 · MONTHLY BRIEF</BureauCode>
        <div className="month-switcher"><button onClick={() => onMonth(shiftMonth(month, -1))}><Icon name="back" /></button><strong>{monthLabel(month)}</strong><button onClick={() => onMonth(shiftMonth(month, 1))}><Icon name="chevron-right" /></button></div>
        <div className="report-hero" data-theme-month={reportMonth}><small>관측 결론</small><h2>대단한 우주 개입은 없었습니다.<br/>그래도 몇 번 피식했습니다.</h2><MonthlyMascot month={reportMonth} className="report-mascot" /></div>
        <div className="report-metrics"><span><small>포착 신호</small><strong>{monthRecords.length}<em>건</em></strong></span><span><small>최고 개입도</small><strong>{strongestStars}<em>%</em></strong></span><span><small>관측 상태</small><strong className="report-online">정상</strong></span></div>
        <h3>우주 개입 농도 분포</h3>
        <div className="bar-chart">{[
          ["혼함", gradeCounts["혼함"], "gray"], ["꽤 괜찮음", gradeCounts["꽤 괜찮음"], "green"], ["이왜진", gradeCounts["이왜진"], "violet"], ["오늘 좀 됨", gradeCounts["오늘 좀 됨"], "blue"], ["우주 개입", gradeCounts["우주 개입"], "pink"],
        ].map(([label, count, tone]) => <div key={String(label)}><span><strong>{count}</strong><i className={`bar-${tone}`} style={{ height: `${22 + (Number(count) / max) * 88}px` }} /></span><small>{label}</small></div>)}</div>
        <h3>이번 달 하찮은 수상작 TOP 3</h3>
        <ol className="top-list">{top.map((item, index) => <li key={item.id}><b>{index + 1}</b><span>{item.title}</span><strong>{item.count}회</strong></li>)}</ol>
      </section>
    </>
  );
}

function ExamplesScreen({ onBack }: { onBack: () => void }) {
  const examples = [fortunes.find((fortune) => fortune.id === 94), fortunes.find((fortune) => fortune.id === 96), fortunes.find((fortune) => fortune.id === 103)].filter((fortune): fortune is (typeof fortunes)[number] => Boolean(fortune));
  return (
    <><Header title="하찮은 수상작" onBack={onBack}/><section className="screen-content examples-screen"><BureauCode status="전시 중">별일 시상위원회 · AWARD ARCHIVE</BureauCode>{examples.map((fortune, index) => <article className="example-card award-card" key={fortune.id}><div><small>NO.{String(fortune.id).padStart(3, "0")}</small><span className="award-ribbon">{["뜻밖의 평화상", "아슬아슬 생존상", "오늘의 피식상"][index]}</span></div><h2>{fortune.cardTitle}</h2><Stars count={index + 1} small/><FortuneObject kind={fortune.asset} characterArt={fortune.characterArt}/><p>{fortune.aside.replaceAll("\n", " ")}</p></article>)}</section></>
  );
}

function GuideScreen({ onBack }: { onBack: () => void }) {
  return <><Header title="우주 개입 농도 안내" onBack={onBack}/><section className="screen-content guide-screen"><BureauCode status="기준 유효">관측 판정 기준 · SIGNAL SCALE</BureauCode><p>관측된 별일에 우주가 얼마나 쓸데없이 개입했는지 계산해요.</p>{gradeGuide.map((item, index) => <article key={item.grade}><OutcomeFace outcome={index === 0 ? "missed" : index === 1 ? "close" : "happened"}/><div><strong>{item.grade}</strong><span>(별 {item.stars}개)</span><p>{item.copy}</p></div></article>)}</section></>;
}

function AboutScreen({ onGuide, onExamples, onReset, confirming }: { onGuide: () => void; onExamples: () => void; onReset: () => void; confirming: boolean }) {
  return (
    <><Header title="별일 관측국은?"/><section className="screen-content about-screen"><BureauCode status="근무 중">관측요원 안내 · CREW FILE</BureauCode><div className="brand-lockup"><strong>별일</strong><i>✦</i><span>관측국</span></div><p className="about-lead">아무 일도 아닌 일을<br/>쓸데없이 관측하고, 보도하고, 시상합니다.</p><h2>이 앱은?</h2><p>오늘의 하찮은 예보를 분류하면 카드가 바로 보관소에 등록돼요. 사진 증거까지 남기면 별가루와 전용 칭호도 받습니다.</p><h2>관측 절차</h2><ol><li><b>1</b>미세한 우주 개입 예보 확인</li><li><b>2</b>실제로 일어났는지 관측</li><li><b>3</b>분류기에 넣어 도감 등록</li><li><b>4</b>사진과 메모로 증거 보강</li></ol><div className="about-actions"><button onClick={onGuide}>우주 개입 농도 안내<Icon name="chevron-right"/></button><button onClick={onExamples}>하찮은 수상작 보기<Icon name="chevron-right"/></button><button className={confirming ? "danger" : ""} onClick={onReset}>{confirming ? "한 번 더 누르면 기록이 삭제돼요" : "내 기록 초기화"}</button></div><div className="about-character"><SpeechBubble className="about-speech" tail="right">우주가 도운 건 3%.<br/>기록한 건 우리.</SpeechBubble><div className="crew-mascot"><Mascot/></div></div></section></>
  );
}

export default function Home() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("today");
  const [view, setView] = useState<View>("main");
  const [fortuneIndex, setFortuneIndex] = useState(now.getDate() % fortunes.length);
  const [fortuneRevealed, setFortuneRevealed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [category, setCategory] = useState<Category>("일상");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordItem[]>(makeSampleRecords(now));
  const [observedFortuneIds, setObservedFortuneIds] = useState<number[]>([]);
  const [activeRecord, setActiveRecord] = useState<RecordItem | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(monthKey(now));
  const [toast, setToast] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentRecordId = useRef<string | null>(null);
  const fortune = fortunes[fortuneIndex];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loadedRecords = loadRecords();
      setRecords(loadedRecords);
      setObservedFortuneIds(loadObservedFortuneIds(loadedRecords));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const mainVisible = view === "main";
  const evidenceCount = records.filter((record) => !record.sample && record.photoDataUrl).length;

  function persist(next: RecordItem[]) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setRecords(next);
      return { records: next, photosSaved: true };
    } catch {
      const withoutPhotos = next.map((record) => ({ ...record, photoDataUrl: undefined }));
      window.localStorage.setItem(storageKey, JSON.stringify(withoutPhotos));
      setRecords(withoutPhotos);
      return { records: withoutPhotos, photosSaved: false };
    }
  }

  function markFortuneObserved(fortuneId: number) {
    setObservedFortuneIds((current) => {
      if (current.includes(fortuneId)) return current;
      const next = [...current, fortuneId];
      try {
        window.localStorage.setItem(observedFortunesKey, JSON.stringify(next));
      } catch {
        setToast("도감 해금 상태를 저장하지 못했어요");
      }
      return next;
    });
  }

  function moveTab(next: Tab) {
    setTab(next); setView("main"); setActiveRecord(null); setConfirmDelete(false); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCard(record: RecordItem) {
    setActiveRecord(record); setView("card"); setConfirmDelete(false); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCollectedFortune(fortuneId: number) {
    const record = records.find((item) => !item.sample && item.fortuneId === fortuneId);
    if (record) { openCard(record); return; }
    setToast("도감 등록 완료 · 관측 기록은 아직 없어요");
  }

  function classifyFortune(nextOutcome: Outcome) {
    setOutcome(nextOutcome);
    const existingId = currentRecordId.current;
    const existing = existingId ? records.find((record) => record.id === existingId) : undefined;

    if (existing) {
      persist(records.map((record) => record.id === existing.id ? { ...record, outcome: nextOutcome } : record));
      setToast("관측 결과를 다시 분류했어요");
      return;
    }

    const created = new Date();
    const record: RecordItem = {
      id: `${created.getTime()}-${fortune.id}`,
      date: localDateKey(created),
      time: created.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      fortuneId: fortune.id,
      title: fortune.cardTitle,
      outcome: nextOutcome,
      category: fortune.category,
      note: "",
    };
    currentRecordId.current = record.id;
    markFortuneObserved(fortune.id);
    persist([record, ...records]);
    setToast("분류 완료 · 도감과 관측일지에 등록했어요");
  }

  function cycleFortune() {
    currentRecordId.current = null; setFortuneIndex((index) => (index + 1) % fortunes.length); setFortuneRevealed(false); setOutcome(null); setCategory(fortunes[(fortuneIndex + 1) % fortunes.length].category); setNote(""); setPhoto(null);
  }

  function selectPhoto(file: File) {
    if (!file.type.startsWith("image/")) { setToast("이미지 파일만 선택할 수 있어요"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setToast("사진을 불러오지 못했어요");
    reader.readAsDataURL(file);
  }

  function saveRecord() {
    if (!outcome) { setToast("먼저 관측 결과를 분류해주세요"); return; }
    const existing = currentRecordId.current ? records.find((record) => record.id === currentRecordId.current) : undefined;
    const earnedEvidence = Boolean(photo && !existing?.photoDataUrl);
    const created = new Date();
    const record: RecordItem = existing ? { ...existing, outcome, category, note: note.trim(), photoDataUrl: photo ?? undefined } : { id: `${created.getTime()}-${fortune.id}`, date: localDateKey(created), time: created.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }), fortuneId: fortune.id, title: fortune.cardTitle, outcome, category, note: note.trim(), photoDataUrl: photo ?? undefined };
    currentRecordId.current = record.id;
    markFortuneObserved(fortune.id);
    const next = existing ? records.map((item) => item.id === record.id ? record : item) : [record, ...records];
    const persisted = persist(next);
    const savedRecord = persisted.records.find((item) => item.id === record.id) ?? record;
    setActiveRecord(savedRecord); setView("card");
    if (earnedEvidence && persisted.photosSaved) setToast("현장 증거 확보 · 별가루 +1");
    else if (photo && persisted.photosSaved) setToast("현장 증거를 갱신했어요");
    else if (photo) setToast("사진 용량이 커서 기록만 저장했어요");
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
    persist(remaining);
    if (!remaining.some((record) => !record.sample && record.fortuneId === activeRecord.fortuneId)) {
      setObservedFortuneIds((current) => {
        const next = current.filter((fortuneId) => fortuneId !== activeRecord.fortuneId);
        window.localStorage.setItem(observedFortunesKey, JSON.stringify(next));
        return next;
      });
    }
    if (currentRecordId.current === activeRecord.id) currentRecordId.current = null;
    setActiveRecord(null); setConfirmDelete(false); setView("main"); setTab("collection"); setToast("카드를 삭제했어요");
  }

  function resetRecords() {
    if (!confirmReset) { setConfirmReset(true); return; }
    persist([]); setObservedFortuneIds([]); window.localStorage.setItem(observedFortunesKey, "[]"); window.localStorage.setItem(legacyStorageKey, "[]"); window.localStorage.setItem(migrationKey, "done"); window.localStorage.setItem(sampleCatalogKey, sampleCatalogVersion); setConfirmReset(false); setToast("내 기록과 도감을 모두 지웠어요");
  }

  function backToMain() { setView("main"); setActiveRecord(null); setConfirmDelete(false); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return (
    <main className="app-shell">
      <div className="phone-surface">
        {view === "capture" && <CaptureScreen category={category} note={note} photo={photo} onBack={backToMain} onCategory={setCategory} onNote={setNote} onPhoto={selectPhoto} onSave={saveRecord} />}
        {view === "card" && activeRecord && <CardScreen record={activeRecord} evidenceCount={evidenceCount} onBack={backToMain} onShare={shareRecord} onCollection={() => moveTab("collection")} onReplay={() => { setView("main"); setTab("today"); }} onDelete={deleteRecord} />}
        {view === "report" && <ReportScreen records={records} month={selectedMonth} onBack={backToMain} onMonth={setSelectedMonth} />}
        {view === "examples" && <ExamplesScreen onBack={backToMain} />}
        {view === "guide" && <GuideScreen onBack={backToMain} />}
        {mainVisible && tab === "today" && <TodayScreen fortuneIndex={fortuneIndex} revealed={fortuneRevealed} outcome={outcome} onOutcome={classifyFortune} onCycle={cycleFortune} onReveal={() => setFortuneRevealed(true)} onCapture={() => { setCategory(fortune.category); setView("capture"); }} onAbout={() => moveTab("about")} />}
        {mainVisible && tab === "collection" && <CollectionScreen observedFortuneIds={observedFortuneIds} records={records} searchOpen={searchOpen} search={search} onSearchOpen={() => setSearchOpen((value) => !value)} onSearch={setSearch} onOpen={openCollectedFortune} />}
        {mainVisible && tab === "records" && <RecordsScreen records={records} selectedMonth={selectedMonth} onMonth={setSelectedMonth} onReport={() => setView("report")} onOpen={openCard} />}
        {mainVisible && tab === "about" && <AboutScreen onGuide={() => setView("guide")} onExamples={() => setView("examples")} onReset={resetRecords} confirming={confirmReset} />}
        {mainVisible && <BottomNav tab={tab} onMove={moveTab} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </main>
  );
}
