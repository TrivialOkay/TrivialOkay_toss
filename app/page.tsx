"use client";

import { useEffect, useMemo, useState } from "react";

type Tab = "today" | "collection" | "records" | "profile";
type Outcome = "happened" | "close" | "missed";

type Fortune = {
  id: number;
  title: string;
  copy: string;
  scene: string;
  aside: string;
};

type RecordItem = {
  id: string;
  date: string;
  time: string;
  fortuneId: number;
  title: string;
  outcome: Outcome;
  note: string;
  sample?: boolean;
};

const fortunes: Fortune[] = [
  {
    id: 23,
    title: "엘리베이터 버튼을 누르기 전에 문이 열릴 수도 있습니다.",
    copy: "큰 기대는 금물! 그래도 타이밍만큼은 꽤 좋겠어요.",
    scene: "엘리베이터가 나를 기다림",
    aside: "어? 열렸네!",
  },
  {
    id: 24,
    title: "마지막 남은 빵 하나가 당신 차지가 될 수도 있습니다.",
    copy: "오늘은 아주 작은 선점 효과가 따라다녀요.",
    scene: "마지막 하나, 내가 가져감",
    aside: "빵이 날 골랐어",
  },
  {
    id: 25,
    title: "배달이 예상보다 3분 빨리 올 수도 있습니다.",
    copy: "세상을 바꾸진 못해도 배고픔은 조금 빨리 끝나요.",
    scene: "배달이 예상보다 빨리 옴",
    aside: "기사님 최고",
  },
  {
    id: 26,
    title: "엉킨 충전선이 한 번에 풀릴 수도 있습니다.",
    copy: "오늘의 손끝에는 하찮지만 분명한 재능이 있어요.",
    scene: "충전선이 순순히 풀림",
    aside: "웬일이지?",
  },
];

const sampleRecords: RecordItem[] = [
  {
    id: "sample-1",
    date: "2026-08-04",
    time: "08:42",
    fortuneId: 23,
    title: "엘리베이터가 나를 기다림",
    outcome: "happened",
    note: "버튼 누르려 했는데 이미 열려 있었음",
    sample: true,
  },
  {
    id: "sample-2",
    date: "2026-08-06",
    time: "14:11",
    fortuneId: 24,
    title: "마지막 하나, 내가 가져감",
    outcome: "close",
    note: "빵은 아니고 마지막 쿠키였음",
    sample: true,
  },
  {
    id: "sample-3",
    date: "2026-08-09",
    time: "16:33",
    fortuneId: 26,
    title: "충전선이 순순히 풀림",
    outcome: "missed",
    note: "오늘도 평소처럼 단단히 엉켜 있었음",
    sample: true,
  },
];

const outcomeMeta: Record<
  Outcome,
  { label: string; short: string; grade: string; stars: number; tone: string }
> = {
  happened: {
    label: "일어남!",
    short: "적중",
    grade: "이왜진",
    stars: 4,
    tone: "violet",
  },
  close: {
    label: "비슷했음",
    short: "근접",
    grade: "꽤 괜찮음",
    stars: 3,
    tone: "green",
  },
  missed: {
    label: "안 일어남",
    short: "빗나감",
    grade: "혼함",
    stars: 1,
    tone: "gray",
  },
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

function loadRecords(): RecordItem[] {
  if (typeof window === "undefined") return sampleRecords;
  try {
    const stored = window.localStorage.getItem("byeoril-records-v1");
    return stored ? (JSON.parse(stored) as RecordItem[]) : sampleRecords;
  } catch {
    return sampleRecords;
  }
}

function Mascot({ small = false }: { small?: boolean }) {
  return (
    <div className={`mascot ${small ? "mascot-small" : ""}`} aria-hidden="true">
      <span className="ear ear-left" />
      <span className="ear ear-right" />
      <span className="face-eye face-eye-left" />
      <span className="face-eye face-eye-right" />
      <span className="face-mouth">⌣</span>
      <span className="blush blush-left" />
      <span className="blush blush-right" />
    </div>
  );
}

function ElevatorScene({ speech }: { speech: string }) {
  return (
    <div className="scene" aria-label="열린 엘리베이터 앞에서 기다리는 별일이 캐릭터">
      <span className="spark spark-one">✦</span>
      <span className="spark spark-two">·</span>
      <div className="elevator">
        <span className="floor-light" />
        <span className="door-line" />
        <span className="door-handle door-handle-left" />
        <span className="door-handle door-handle-right" />
      </div>
      <div className="scene-mascot">
        <Mascot small />
        <span className="speech">{speech}</span>
      </div>
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="stars" aria-label={`별점 5점 중 ${count}점`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < count ? "star-filled" : "star-empty"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function Home() {
  const dailyIndex = new Date().getDate() % fortunes.length;
  const [tab, setTab] = useState<Tab>("today");
  const [fortuneIndex, setFortuneIndex] = useState(dailyIndex);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [note, setNote] = useState("");
  const [records, setRecords] = useState<RecordItem[]>(sampleRecords);
  const [activeCard, setActiveCard] = useState<RecordItem | null>(null);
  const [filter, setFilter] = useState<"전체" | "혼함" | "꽤 괜찮음" | "이왜진">("전체");
  const [toast, setToast] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const fortune = fortunes[fortuneIndex];

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredRecords = useMemo(() => {
    if (filter === "전체") return records;
    return records.filter((item) => outcomeMeta[item.outcome].grade === filter);
  }, [filter, records]);

  const realRecordCount = records.filter((item) => !item.sample).length;
  const hitCount = records.filter((item) => item.outcome === "happened").length;
  const hitRate = records.length ? Math.round((hitCount / records.length) * 100) : 0;

  function moveTab(nextTab: Tab) {
    setTab(nextTab);
    setActiveCard(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cycleFortune() {
    setFortuneIndex((index) => (index + 1) % fortunes.length);
    setOutcome(null);
    setNote("");
  }

  function saveCard() {
    if (!outcome) return;
    const now = new Date();
    const item: RecordItem = {
      id: `${now.getTime()}`,
      date: localDateKey(now),
      time: now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      fortuneId: fortune.id,
      title: fortune.scene,
      outcome,
      note: note.trim(),
    };
    const next = [item, ...records];
    setRecords(next);
    window.localStorage.setItem("byeoril-records-v1", JSON.stringify(next));
    setActiveCard(item);
    setToast("오늘의 별일 카드가 저장됐어요");
  }

  async function shareCard(item: RecordItem) {
    const text = `오늘의 별일: ${item.title} · ${outcomeMeta[item.outcome].grade}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "별일", text });
      } else {
        await navigator.clipboard.writeText(text);
        setToast("카드 문구를 복사했어요");
      }
    } catch {
      // The native share sheet can be dismissed without changing app state.
    }
  }

  function resetRecords() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setRecords([]);
    window.localStorage.setItem("byeoril-records-v1", "[]");
    setConfirmReset(false);
    setToast("내 기록을 모두 지웠어요");
  }

  return (
    <main className="app-shell">
      <div className="phone-surface">
        <header className="topbar">
          <div>
            <span className="eyebrow">하찮은 하루 수집소</span>
            <h1>별일</h1>
          </div>
          <div className="brand-mark" aria-hidden="true">✦</div>
        </header>

        <div className="app-content">
          {tab === "today" && !activeCard && (
            <section className="view" aria-labelledby="today-title">
              <div className="section-heading">
                <div>
                  <p className="date-label">{todayLabel()}</p>
                  <h2 id="today-title">오늘</h2>
                </div>
                <button className="text-button" onClick={cycleFortune} aria-label="다른 하찮은 운세 보기">
                  ↻ 다른 별일
                </button>
              </div>

              <article className="fortune-card paper-card">
                <div className="card-kicker">
                  <span className="crystal">●</span>
                  오늘의 하찮은 운세
                  <span className="help-dot" title="거창하지 않은 오늘의 가능성이에요">?</span>
                </div>
                <h3>{fortune.title}</h3>
                <p>큰 기대는 금물!</p>
                <ElevatorScene speech={fortune.aside} />
              </article>

              <div className="question-block">
                <h3>이런 일, 실제로 일어났나요?</h3>
                <div className="outcome-grid" role="group" aria-label="오늘의 운세 결과 선택">
                  {(Object.keys(outcomeMeta) as Outcome[]).map((key) => (
                    <button
                      key={key}
                      className={`outcome-button ${outcome === key ? "selected" : ""}`}
                      onClick={() => setOutcome(key)}
                      aria-pressed={outcome === key}
                    >
                      <span className="outcome-face" aria-hidden="true">
                        {key === "happened" ? "☺" : key === "close" ? "•‿•" : "⌢"}
                      </span>
                      {outcomeMeta[key].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`memo-panel ${outcome ? "memo-visible" : ""}`} aria-hidden={!outcome}>
                <label htmlFor="note">짧은 한 줄 메모 <span>(선택)</span></label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 60))}
                  placeholder="무슨 일이 있었는지 적어보세요"
                  disabled={!outcome}
                />
                <span className="character-count">{note.length}/60</span>
              </div>

              <button className="primary-button" disabled={!outcome} onClick={saveCard}>
                별일 카드 만들기
              </button>
              <p className="privacy-note">기록은 이 기기에만 저장돼요.</p>
            </section>
          )}

          {tab === "today" && activeCard && (
            <section className="view card-view" aria-labelledby="card-title">
              <div className="card-title-row">
                <div>
                  <span className="eyebrow">오늘의 별일 카드</span>
                  <h2 id="card-title">피식 보고서</h2>
                </div>
                <button className="icon-button" onClick={() => shareCard(activeCard)} aria-label="카드 공유하기">↗</button>
              </div>
              <article className="result-card paper-card">
                <div className="result-meta">
                  <strong>NO.{String(activeCard.fortuneId).padStart(3, "0")}</strong>
                  <span className={`badge badge-${outcomeMeta[activeCard.outcome].tone}`}>
                    {outcomeMeta[activeCard.outcome].grade}
                  </span>
                </div>
                <h3>{activeCard.title}</h3>
                <Stars count={outcomeMeta[activeCard.outcome].stars} />
                <ElevatorScene speech={fortune.aside} />
                <div className="interpretation">
                  <strong>별일의 쓸데없는 해석</strong>
                  <p>{fortune.copy}</p>
                </div>
                {activeCard.note && <p className="saved-note">“{activeCard.note}”</p>}
                <dl className="card-stats">
                  <div><dt>발견 날짜</dt><dd>{activeCard.date.replaceAll("-", ".")}</dd></div>
                  <div><dt>발견 시간</dt><dd>{activeCard.time}</dd></div>
                  <div><dt>별일 등급</dt><dd>{outcomeMeta[activeCard.outcome].grade}</dd></div>
                </dl>
              </article>
              <div className="button-row">
                <button className="secondary-button" onClick={() => setActiveCard(null)}>↻ 다시 보기</button>
                <button className="primary-button compact" onClick={() => moveTab("collection")}>도감으로</button>
              </div>
            </section>
          )}

          {tab === "collection" && (
            <section className="view" aria-labelledby="collection-title">
              <div className="section-heading collection-heading">
                <div>
                  <span className="eyebrow">모아보니 제법 별일</span>
                  <h2 id="collection-title">별일 도감</h2>
                </div>
                <span className="count-pill">{records.length}장</span>
              </div>
              <div className="monthly-summary">
                <div>
                  <span>8월의 한 줄 요약</span>
                  <strong>대단한 일은 없었습니다.<br />그래도 꽤 괜찮았어요.</strong>
                </div>
                <Mascot small />
              </div>
              <div className="filter-row" role="group" aria-label="도감 필터">
                {(["전체", "혼함", "꽤 괜찮음", "이왜진"] as const).map((item) => (
                  <button
                    key={item}
                    className={filter === item ? "active" : ""}
                    onClick={() => setFilter(item)}
                    aria-pressed={filter === item}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="collection-list">
                {filteredRecords.length ? filteredRecords.map((item) => (
                  <button
                    className="collection-item"
                    key={item.id}
                    onClick={() => {
                      setActiveCard(item);
                      setTab("today");
                    }}
                  >
                    <div className={`mini-icon mini-${item.fortuneId % 4}`} aria-hidden="true">
                      {item.fortuneId % 4 === 0 ? "🥐" : item.fortuneId % 4 === 1 ? "🛵" : item.fortuneId % 4 === 2 ? "〰" : "▥"}
                    </div>
                    <div className="collection-copy">
                      <span className="item-number">{String(item.fortuneId).padStart(3, "0")}</span>
                      <strong>{item.title}</strong>
                      <small>{item.date.slice(5).replace("-", ".")} · {outcomeMeta[item.outcome].short}{item.sample ? " · 샘플" : ""}</small>
                    </div>
                    <span className={`badge badge-${outcomeMeta[item.outcome].tone}`}>{outcomeMeta[item.outcome].grade}</span>
                  </button>
                )) : (
                  <div className="empty-state"><Mascot /><strong>아직 이 등급의 별일이 없어요.</strong></div>
                )}
              </div>
            </section>
          )}

          {tab === "records" && (
            <section className="view" aria-labelledby="records-title">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">2026년 8월</span>
                  <h2 id="records-title">내 기록</h2>
                </div>
                <span className="count-pill">{records.length}개</span>
              </div>
              <div className="calendar-card">
                <div className="week-row" aria-hidden="true">
                  {['일','월','화','수','목','금','토'].map(day => <span key={day}>{day}</span>)}
                </div>
                <div className="calendar-grid">
                  {Array.from({ length: 35 }, (_, index) => {
                    const day = index - 5;
                    const hasRecord = day > 0 && records.some(item => Number(item.date.slice(-2)) === day);
                    return <span key={index} className={`${day === 11 ? "today" : ""} ${hasRecord ? "has-record" : ""}`}>{day > 0 && day <= 31 ? day : ""}</span>;
                  })}
                </div>
              </div>
              <div className="stats-grid">
                <div><strong>{records.length}</strong><span>모은 카드</span></div>
                <div><strong>{hitRate}%</strong><span>운세 적중률</span></div>
                <div><strong>{realRecordCount}</strong><span>내가 쓴 기록</span></div>
              </div>
              <h3 className="subheading">최근 별일</h3>
              <div className="timeline">
                {records.slice(0, 5).map((item) => (
                  <div className="timeline-item" key={item.id}>
                    <span className={`timeline-dot dot-${outcomeMeta[item.outcome].tone}`} />
                    <div><strong>{item.title}</strong><small>{item.date.replaceAll("-", ".")} · {item.time}</small></div>
                    <span>{outcomeMeta[item.outcome].short}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === "profile" && (
            <section className="view" aria-labelledby="profile-title">
              <div className="profile-hero">
                <Mascot />
                <div><span className="eyebrow">나의 하찮력</span><h2 id="profile-title">조용한 수집가</h2></div>
              </div>
              <div className="profile-card">
                <div><span>도감 진행률</span><strong>{Math.min(100, records.length * 4)}%</strong></div>
                <div className="progress"><span style={{ width: `${Math.min(100, records.length * 4)}%` }} /></div>
                <p>별일 {Math.max(0, 25 - records.length)}개를 더 모으면 다음 칭호가 열려요.</p>
              </div>
              <div className="quote-card">
                <span>오늘의 코멘트</span>
                <strong>인생, 별거 없지만<br />이런 재미로 사는 거지.</strong>
              </div>
              <div className="settings-list">
                <div><span>알림</span><strong>매일 오전 8시</strong></div>
                <div><span>저장 방식</span><strong>내 기기에만</strong></div>
                <button className={confirmReset ? "danger" : ""} onClick={resetRecords}>
                  {confirmReset ? "한 번 더 누르면 모두 지워져요" : "내 기록 초기화"}
                </button>
              </div>
            </section>
          )}
        </div>

        <nav className="bottom-nav" aria-label="주요 메뉴">
          {([
            ["today", "☀", "오늘"],
            ["collection", "▣", "도감"],
            ["records", "▤", "기록"],
            ["profile", "♙", "내 정보"],
          ] as const).map(([key, icon, label]) => (
            <button key={key} className={tab === key ? "active" : ""} onClick={() => moveTab(key)} aria-current={tab === key ? "page" : undefined}>
              <span aria-hidden="true">{icon}</span>{label}
            </button>
          ))}
        </nav>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </main>
  );
}
