"use client";

import { useEffect, useRef, useState } from "react";
import {
  categories,
  collectionFilters,
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
} from "./byeoril-data";
import { BottomNav, FortuneObject, FortuneScene, Icon, Mascot, OutcomeFace, Stars, StatusBar } from "./byeoril-ui";

const storageKey = "byeoril-records-v2";
const legacyStorageKey = "byeoril-records-v1";
const migrationKey = "byeoril-records-v1-migrated";

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
    const current = readStoredRecords(storageKey) ?? makeSampleRecords();
    if (window.localStorage.getItem(migrationKey) === "done") return current;

    const legacy = (readStoredRecords(legacyStorageKey) ?? []).filter((record) => !record.sample);
    const merged = [...legacy, ...current].filter((record, index, records) => records.findIndex((item) => item.id === record.id) === index);
    window.localStorage.setItem(storageKey, JSON.stringify(merged));
    window.localStorage.setItem(migrationKey, "done");
    return merged;
  } catch {
    return makeSampleRecords();
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

function TodayScreen({
  fortuneIndex,
  outcome,
  onOutcome,
  onCycle,
  onCapture,
  onAbout,
}: {
  fortuneIndex: number;
  outcome: Outcome;
  onOutcome: (value: Outcome) => void;
  onCycle: () => void;
  onCapture: () => void;
  onAbout: () => void;
}) {
  const fortune = fortunes[fortuneIndex];
  return (
    <>
      <header className="today-header"><h1>오늘</h1><button className="icon-button" onClick={onAbout} aria-label="내 정보 열기"><Icon name="settings" /></button></header>
      <section className="screen-content today-screen" aria-labelledby="today-date">
        <div className="today-date-row">
          <div className="date-button" id="today-date">{dateLabel()} <Icon name="chevron-down" /></div>
          <button className="outline-button fortune-refresh" onClick={onCycle}><Icon name="refresh" />다른 운세 보기</button>
        </div>
        <article className="fortune-card">
          <div className="fortune-kicker"><span className="crystal-ball" />오늘의 하찮은 운세<span className="help-circle">?</span></div>
          <h2>{fortune.title}</h2>
          <p>큰 기대는 금물!</p>
          <FortuneScene kind={fortune.asset} speech={fortune.aside} />
        </article>
        <section className="outcome-section">
          <h2>이런 일, 실제로 일어났나요?</h2>
          <div className="outcome-grid" role="group" aria-label="오늘의 운세 결과">
            {(Object.keys(outcomeMeta) as Outcome[]).map((key) => (
              <button key={key} className={`outcome-button ${outcome === key ? "selected" : ""}`} onClick={() => onOutcome(key)} aria-pressed={outcome === key}>
                <strong>{outcomeMeta[key].label}</strong><OutcomeFace outcome={key} />
              </button>
            ))}
          </div>
        </section>
        <button className="photo-record-button" onClick={onCapture}><span className="camera-symbol"><Icon name="camera" /></span><strong>사진 찍고 기록하기 <small>(선택)</small></strong><Icon name="chevron-right" /></button>
      </section>
    </>
  );
}

function CaptureScreen({
  category,
  note,
  photo,
  onBack,
  onCategory,
  onNote,
  onPhoto,
  onSave,
}: {
  category: Category;
  note: string;
  photo: string | null;
  onBack: () => void;
  onCategory: (value: Category) => void;
  onNote: (value: string) => void;
  onPhoto: (file: File) => void;
  onSave: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Header title="기록하기" onBack={onBack} />
      <section className="screen-content capture-screen">
        <h2>어떤 일이었나요?</h2>
        <div className="category-grid" role="group" aria-label="기록 카테고리">
          {categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => onCategory(item)}>{item}</button>)}
        </div>
        <h2>사진 <span>(선택)</span></h2>
        <button className="capture-photo" onClick={() => inputRef.current?.click()} aria-label="사진 선택 또는 변경">
          {photo ? <img src={photo} alt="선택한 사진" /> : <span className="capture-placeholder"><img src="/byeoril-elevator.png" alt="" /><Mascot className="capture-mascot" /></span>}
          <span className="photo-change"><Icon name="camera" />사진 변경</span>
        </button>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => event.target.files?.[0] && onPhoto(event.target.files[0])} />
        <label className="memo-field">짧은 한 줄 메모 <span>(선택)</span><textarea value={note} maxLength={40} onChange={(event) => onNote(event.target.value)} placeholder="버튼 누르려 했는데 이미 열려있음 ㅋㅋ"/><small>{note.length}/40</small></label>
        <button className="black-button record-submit" onClick={onSave}>기록 완료!</button>
      </section>
    </>
  );
}

function CardScreen({ record, onBack, onShare, onCollection, onReplay, onDelete }: { record: RecordItem; onBack: () => void; onShare: () => void; onCollection: () => void; onReplay: () => void; onDelete: () => void }) {
  const fortune = fortuneFor(record.fortuneId);
  const grade = gradeFor(record);
  return (
    <>
      <Header title="카드 보기" onBack={onBack} right={<><button className="icon-button" onClick={onShare} aria-label="공유하기"><Icon name="share" /></button><button className="icon-button" onClick={onDelete} aria-label="카드 삭제"><Icon name="more" /></button></>} />
      <section className="screen-content card-screen">
        <article className="result-card">
          <div className="result-meta"><strong>NO.{String(record.fortuneId).padStart(3, "0")}</strong><span className={`grade-badge tone-${grade.tone}`}>{grade.grade}</span></div>
          <h2>{record.title}</h2>
          <Stars count={grade.stars} />
          {record.photoDataUrl ? <div className="card-photo"><img src={record.photoDataUrl} alt="기록 사진" /></div> : <FortuneScene kind={fortune.asset} speech={fortune.aside} card />}
          <div className="interpretation"><strong>AI의 쓸데없는 해석</strong><p>{fortune.copy}</p><Mascot className="interpretation-mascot" /></div>
          {record.note && <p className="record-quote">“{record.note}”</p>}
          <dl className="card-stats"><div><dt>발견 날짜</dt><dd>{record.date.replaceAll("-", ".")}</dd></div><div><dt>발견 시간</dt><dd>{record.time}</dd></div><div><dt>별일 횟수</dt><dd>{record.sample ? "3회" : "1회"}</dd></div></dl>
        </article>
        <div className="card-actions"><button className="outline-button" onClick={onReplay}><Icon name="refresh" />다시 보기</button><button className="black-button" onClick={onShare}><Icon name="share" />공유하기</button><button className="outline-button" onClick={onCollection}><span className="tiny-picture"/>도감으로</button></div>
      </section>
    </>
  );
}

function CollectionScreen({ records, filter, searchOpen, search, onFilter, onSearchOpen, onSearch, onOpen, onGuide, onExamples }: { records: RecordItem[]; filter: string; searchOpen: boolean; search: string; onFilter: (value: string) => void; onSearchOpen: () => void; onSearch: (value: string) => void; onOpen: (record: RecordItem) => void; onGuide: () => void; onExamples: () => void }) {
  const filtered = records.filter((record) => {
    const matchesGrade = filter === "전체" || gradeFor(record).grade === filter;
    const matchesSearch = !search.trim() || record.title.includes(search.trim());
    return matchesGrade && matchesSearch;
  });
  return (
    <>
      <Header title="별일 도감" right={<><button className="icon-button" onClick={onGuide} aria-label="별일 등급 안내"><Icon name="help" /></button><button className="icon-button" onClick={onSearchOpen} aria-label="도감 검색"><Icon name="search" /></button></>} />
      <section className="screen-content collection-screen">
        <button className="month-summary" onClick={onExamples}><span><small>{new Date().getMonth() + 1}월의 한 줄 요약</small><strong>대단한 일은 없었습니다.<br/>그래도 꽤 괜찮았어요.</strong></span><Mascot className="summary-mascot" /></button>
        {searchOpen && <label className="search-field"><Icon name="search"/><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="별일을 검색해보세요"/></label>}
        <div className="filter-row" role="group" aria-label="도감 필터">{collectionFilters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => onFilter(item)}>{item}</button>)}</div>
        <div className="collection-list">
          {filtered.map((record) => {
            const fortune = fortuneFor(record.fortuneId);
            const grade = gradeFor(record);
            return <button className={`collection-item ${record.fortuneId === 23 ? "featured" : ""}`} key={record.id} onClick={() => onOpen(record)}><span className="collection-number">{String(record.fortuneId).padStart(3, "0")}</span><span className="collection-art"><FortuneObject kind={fortune.asset} compact /></span><span className="collection-copy"><strong>{record.title}</strong><small>★ {grade.grade}<b>발견 {record.sample ? (record.fortuneId % 8) + 2 : 1}회</b></small></span></button>;
          })}
          {!filtered.length && <div className="empty-state"><Mascot/><strong>조건에 맞는 별일이 없어요.</strong></div>}
        </div>
      </section>
    </>
  );
}

function RecordsScreen({ records, selectedMonth, onMonth, onReport, onOpen }: { records: RecordItem[]; selectedMonth: string; onMonth: (value: string) => void; onReport: () => void; onOpen: (record: RecordItem) => void }) {
  const monthRecords = records.filter((record) => record.date.startsWith(selectedMonth));
  const cells = calendarCells(selectedMonth);
  const today = localDateKey();
  return (
    <>
      <Header title="내 기록" right={<button className="icon-button" onClick={onReport} aria-label="월간 리포트"><Icon name="chart" /></button>} />
      <section className="screen-content records-screen">
        <div className="month-switcher"><button onClick={() => onMonth(shiftMonth(selectedMonth, -1))}><Icon name="back" /></button><strong>{monthLabel(selectedMonth)}</strong><button onClick={() => onMonth(shiftMonth(selectedMonth, 1))}><Icon name="chevron-right" /></button></div>
        <div className="calendar"><div className="week-row">{["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { const key = day ? `${selectedMonth}-${String(day).padStart(2, "0")}` : ""; const has = monthRecords.some((record) => record.date === key); return <span key={`${day}-${index}`} className={`${key === today ? "today" : ""} ${has ? "has-record" : ""}`}>{day || ""}</span>; })}</div></div>
        <h2>{Number(selectedMonth.slice(5))}월의 기록</h2>
        <div className="record-list">
          {monthRecords.map((record) => { const fortune = fortuneFor(record.fortuneId); const grade = gradeFor(record); return <button key={record.id} onClick={() => onOpen(record)}><span className="record-thumb"><FortuneObject kind={fortune.asset} compact /></span><span><strong>{record.title}</strong><small>{record.time} · {record.category}</small></span><em className={`grade-badge tone-${grade.tone}`}>{grade.grade}</em></button>; })}
          {!monthRecords.length && <div className="empty-state compact"><Mascot/><strong>이 달의 기록이 아직 없어요.</strong></div>}
        </div>
        <button className="month-comment" onClick={onReport}><span><small>오늘의 코멘트</small><strong>별일 없는 하루였지만,<br/>이런 게 웃어 인생이 되더라구요.</strong></span><Mascot /></button>
      </section>
    </>
  );
}

function ReportScreen({ records, month, onBack, onMonth }: { records: RecordItem[]; month: string; onBack: () => void; onMonth: (value: string) => void }) {
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
  return (
    <>
      <Header title="월간 리포트" onBack={onBack} right={<Icon name="chart" />} />
      <section className="screen-content report-screen">
        <div className="month-switcher"><button onClick={() => onMonth(shiftMonth(month, -1))}><Icon name="back" /></button><strong>{monthLabel(month)}</strong><button onClick={() => onMonth(shiftMonth(month, 1))}><Icon name="chevron-right" /></button></div>
        <div className="report-hero"><h2>대단한 일은 없었습니다.<br/>그래도 꽤 괜찮았어요.</h2><Mascot className="report-mascot" resting /></div>
        <h3>별일 농도 분포</h3>
        <div className="bar-chart">{[
          ["혼함", gradeCounts["혼함"], "gray"], ["꽤 괜찮음", gradeCounts["꽤 괜찮음"], "green"], ["이왜진", gradeCounts["이왜진"], "violet"], ["오늘 좀 됨", gradeCounts["오늘 좀 됨"], "blue"], ["우주 개입", gradeCounts["우주 개입"], "pink"],
        ].map(([label, count, tone]) => <div key={String(label)}><span><strong>{count}</strong><i className={`bar-${tone}`} style={{ height: `${22 + (Number(count) / max) * 88}px` }} /></span><small>{label}</small></div>)}</div>
        <h3>가장 많이 발견한 별일 TOP 3</h3>
        <ol className="top-list">{top.map((item, index) => <li key={item.id}><b>{index + 1}</b><span>{item.title}</span><strong>{item.count}회</strong></li>)}</ol>
      </section>
    </>
  );
}

function ExamplesScreen({ onBack }: { onBack: () => void }) {
  const examples = fortunes.slice(4, 6).concat(fortunes.slice(1, 2));
  return (
    <><Header title="다른 카드 예시" onBack={onBack}/><section className="screen-content examples-screen">{examples.map((fortune, index) => <article className="example-card" key={fortune.id}><div><small>NO.{String(fortune.id).padStart(3, "0")}</small><span className={`grade-badge tone-${index === 0 ? "gray" : index === 1 ? "green" : "yellow"}`}>{index === 0 ? "혼함" : index === 1 ? "꽤 괜찮음" : "오늘 좀 됨"}</span></div><h2>{fortune.cardTitle}</h2><Stars count={index + 1} small/><FortuneObject kind={fortune.asset}/><p>{fortune.aside.replaceAll("\n", " ")}</p></article>)}</section></>
  );
}

function GuideScreen({ onBack }: { onBack: () => void }) {
  return <><Header title="별일 농도 안내" onBack={onBack}/><section className="screen-content guide-screen"><p>당신 기준으로 얼마나 드문 일이었는지 AI가 계산해요.</p>{gradeGuide.map((item, index) => <article key={item.grade}><OutcomeFace outcome={index === 0 ? "missed" : index === 1 ? "close" : "happened"}/><div><strong>{item.grade}</strong><span>(별 {item.stars}개)</span><p>{item.copy}</p></div></article>)}</section></>;
}

function AboutScreen({ onGuide, onExamples, onReset, confirming }: { onGuide: () => void; onExamples: () => void; onReset: () => void; confirming: boolean }) {
  return (
    <><Header title="별일은?"/><section className="screen-content about-screen"><div className="brand-lockup"><strong>별일</strong><i>✦</i></div><p className="about-lead">아무 일도 아닌 일을<br/>굳이 운세로 알려드립니다.</p><h2>이 앱은?</h2><p>하찮은 운세를 보고 실제로 일어났는지 기록하면 AI가 피식한 카드를 만들어줘요. 그 모든 걸 ‘별일 도감’에 모을 수 있어요.</p><h2>사용 흐름</h2><ol><li><b>1</b>오늘의 하찮은 운세 보기</li><li><b>2</b>실제로 일어났는지 기록</li><li><b>3</b>AI가 카드 생성</li><li><b>4</b>도감에 자동 저장</li></ol><div className="about-actions"><button onClick={onGuide}>별일 농도 안내<Icon name="chevron-right"/></button><button onClick={onExamples}>다른 카드 예시<Icon name="chevron-right"/></button><button className={confirming ? "danger" : ""} onClick={onReset}>{confirming ? "한 번 더 누르면 기록이 삭제돼요" : "내 기록 초기화"}</button></div><div className="about-character"><span>인생, 별거 없지만<br/>이런 재미로 사는 거지.</span><Mascot/></div></section></>
  );
}

export default function Home() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("today");
  const [view, setView] = useState<View>("main");
  const [fortuneIndex, setFortuneIndex] = useState(now.getDate() % fortunes.length);
  const [outcome, setOutcome] = useState<Outcome>("happened");
  const [category, setCategory] = useState<Category>("일상");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordItem[]>(makeSampleRecords(now));
  const [activeRecord, setActiveRecord] = useState<RecordItem | null>(null);
  const [filter, setFilter] = useState<string>("전체");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(monthKey(now));
  const [toast, setToast] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fortune = fortunes[fortuneIndex];

  useEffect(() => {
    const timer = window.setTimeout(() => setRecords(loadRecords()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const mainVisible = view === "main";

  function persist(next: RecordItem[]) {
    setRecords(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setToast("사진 용량이 커서 기록만 저장했어요");
      const withoutPhotos = next.map((record) => ({ ...record, photoDataUrl: undefined }));
      window.localStorage.setItem(storageKey, JSON.stringify(withoutPhotos));
    }
  }

  function moveTab(next: Tab) {
    setTab(next); setView("main"); setActiveRecord(null); setConfirmDelete(false); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCard(record: RecordItem) {
    setActiveRecord(record); setView("card"); setConfirmDelete(false); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cycleFortune() {
    setFortuneIndex((index) => (index + 1) % fortunes.length); setOutcome("happened"); setCategory(fortunes[(fortuneIndex + 1) % fortunes.length].category); setNote(""); setPhoto(null);
  }

  function selectPhoto(file: File) {
    if (!file.type.startsWith("image/")) { setToast("이미지 파일만 선택할 수 있어요"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setToast("사진을 불러오지 못했어요");
    reader.readAsDataURL(file);
  }

  function saveRecord() {
    const created = new Date();
    const record: RecordItem = { id: String(created.getTime()), date: localDateKey(created), time: created.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }), fortuneId: fortune.id, title: fortune.cardTitle, outcome, category, note: note.trim(), photoDataUrl: photo ?? undefined };
    persist([record, ...records]); setActiveRecord(record); setView("card"); setToast("도감에 자동 저장했어요");
  }

  async function shareRecord() {
    if (!activeRecord) return;
    const text = `별일 NO.${String(activeRecord.fortuneId).padStart(3, "0")} · ${activeRecord.title} · ${gradeFor(activeRecord).grade}`;
    try {
      if (navigator.share) await navigator.share({ title: "별일", text });
      else { await navigator.clipboard.writeText(text); setToast("카드 문구를 복사했어요"); }
    } catch { /* share sheet dismissed */ }
  }

  function deleteRecord() {
    if (!activeRecord) return;
    if (!confirmDelete) { setConfirmDelete(true); setToast("한 번 더 누르면 카드가 삭제돼요"); return; }
    persist(records.filter((record) => record.id !== activeRecord.id)); setActiveRecord(null); setConfirmDelete(false); setView("main"); setTab("collection"); setToast("카드를 삭제했어요");
  }

  function resetRecords() {
    if (!confirmReset) { setConfirmReset(true); return; }
    persist([]); window.localStorage.setItem(legacyStorageKey, "[]"); window.localStorage.setItem(migrationKey, "done"); setConfirmReset(false); setToast("내 기록을 모두 지웠어요");
  }

  function backToMain() { setView("main"); setActiveRecord(null); setConfirmDelete(false); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return (
    <main className="app-shell">
      <div className="phone-surface">
        <StatusBar />
        {view === "capture" && <CaptureScreen category={category} note={note} photo={photo} onBack={backToMain} onCategory={setCategory} onNote={setNote} onPhoto={selectPhoto} onSave={saveRecord} />}
        {view === "card" && activeRecord && <CardScreen record={activeRecord} onBack={backToMain} onShare={shareRecord} onCollection={() => moveTab("collection")} onReplay={() => { setView("main"); setTab("today"); }} onDelete={deleteRecord} />}
        {view === "report" && <ReportScreen records={records} month={selectedMonth} onBack={backToMain} onMonth={setSelectedMonth} />}
        {view === "examples" && <ExamplesScreen onBack={backToMain} />}
        {view === "guide" && <GuideScreen onBack={backToMain} />}
        {mainVisible && tab === "today" && <TodayScreen fortuneIndex={fortuneIndex} outcome={outcome} onOutcome={setOutcome} onCycle={cycleFortune} onCapture={() => { setCategory(fortune.category); setView("capture"); }} onAbout={() => moveTab("about")} />}
        {mainVisible && tab === "collection" && <CollectionScreen records={records} filter={filter} searchOpen={searchOpen} search={search} onFilter={setFilter} onSearchOpen={() => setSearchOpen((value) => !value)} onSearch={setSearch} onOpen={openCard} onGuide={() => setView("guide")} onExamples={() => setView("examples")} />}
        {mainVisible && tab === "records" && <RecordsScreen records={records} selectedMonth={selectedMonth} onMonth={setSelectedMonth} onReport={() => setView("report")} onOpen={openCard} />}
        {mainVisible && tab === "about" && <AboutScreen onGuide={() => setView("guide")} onExamples={() => setView("examples")} onReset={resetRecords} confirming={confirmReset} />}
        {mainVisible && <BottomNav tab={tab} onMove={moveTab} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </main>
  );
}
