export type Tab = "today" | "collection" | "records" | "about";
export type View = "main" | "capture" | "card" | "report" | "examples" | "guide";
export type Outcome = "happened" | "close" | "missed";
export type Category = "교통" | "음식" | "사람" | "일상" | "기타";
export type AssetKind = "usb" | "signal" | "elevator" | "bread" | "delivery" | "cable";

export type Fortune = {
  id: number;
  title: string;
  cardTitle: string;
  copy: string;
  aside: string;
  asset: AssetKind;
  category: Category;
};

export type RecordItem = {
  id: string;
  date: string;
  time: string;
  fortuneId: number;
  title: string;
  outcome: Outcome;
  category: Category;
  note: string;
  photoDataUrl?: string;
  sample?: boolean;
};

export const fortunes: Fortune[] = [
  {
    id: 23,
    title: "엘리베이터 버튼을 누르기 전에 문이 열릴 수도 있습니다.",
    cardTitle: "얘가 마침 여기 있었음",
    copy: "당신을 위해 미리 도착했을 리는 없고, 그냥 운이 3% 좋았습니다. 그래도 좀 굿즈?",
    aside: "기다리기\n귀찮았는데\n다행.",
    asset: "elevator",
    category: "일상",
  },
  {
    id: 24,
    title: "마지막 남은 빵 하나가 당신 차지가 될 수도 있습니다.",
    cardTitle: "마지막 하나, 내가 가져감",
    copy: "빵이 당신을 고른 건 아닙니다. 그래도 마지막 한 개를 지켜낸 건 제법입니다.",
    aside: "왜 항상 나야.\n(그래도 고마워)",
    asset: "bread",
    category: "음식",
  },
  {
    id: 25,
    title: "배달이 예상보다 3분 빨리 올 수도 있습니다.",
    cardTitle: "배달이 예상보다 빨리 옴",
    copy: "세상을 바꾸진 못해도 배고픔은 조금 빨리 끝났습니다.",
    aside: "기사님\n최고",
    asset: "delivery",
    category: "음식",
  },
  {
    id: 26,
    title: "엉킨 충전선이 한 번에 풀릴 수도 있습니다.",
    cardTitle: "오늘은 앞뒤를 구별했음",
    copy: "오늘의 손끝에는 하찮지만 분명한 재능이 있었습니다.",
    aside: "웬일이지?",
    asset: "cable",
    category: "일상",
  },
  {
    id: 21,
    title: "USB가 오늘만큼은 한 번에 꽂힐 수도 있습니다.",
    cardTitle: "오늘도 USB와 화해 성공",
    copy: "방향 감각이 돌아온 건 잠깐일 수 있습니다. 지금을 즐기세요.",
    aside: "오늘은\n한 번에!",
    asset: "usb",
    category: "일상",
  },
  {
    id: 22,
    title: "신호등이 건너는 동안 계속 초록일 수도 있습니다.",
    cardTitle: "신호등이 내 편이었음 (8초)",
    copy: "도시 전체가 도운 것은 아니지만, 적어도 이 교차로는 당신 편이었습니다.",
    aside: "8초 동안\n초록빛 번.",
    asset: "signal",
    category: "교통",
  },
];

export const outcomeMeta: Record<
  Outcome,
  { label: string; short: string; tone: string }
> = {
  happened: { label: "일어남!", short: "적중", tone: "violet" },
  close: { label: "비슷했음", short: "근접", tone: "green" },
  missed: { label: "안 일어남", short: "빗나감", tone: "gray" },
};

export function gradeFor(record: Pick<RecordItem, "outcome" | "fortuneId">) {
  if (record.outcome === "missed") return { grade: "혼함", stars: 1, tone: "gray" };
  if (record.outcome === "close") return { grade: "꽤 괜찮음", stars: 2, tone: "green" };
  if (record.fortuneId % 11 === 0) return { grade: "우주 개입", stars: 5, tone: "blue" };
  if (record.fortuneId % 2 === 0) return { grade: "오늘 좀 됨", stars: 4, tone: "yellow" };
  return { grade: "이왜진", stars: 3, tone: "violet" };
}

export const gradeGuide = [
  { grade: "혼함", stars: 1, copy: "자주 일어나는 일. 별일 아닌데 기록해줘서 감사." },
  { grade: "꽤 괜찮음", stars: 2, copy: "가끔 있는 일. 생각보다 운이 좋으셨네요." },
  { grade: "이왜진", stars: 3, copy: "잘 안 일어나는 일. 피식, 할 만합니다." },
  { grade: "대충 기적", stars: 4, copy: "진짜 드문 일. 자랑해도 됩니다." },
  { grade: "우주 개입", stars: 5, copy: "이 정도면 우주가 도운 날." },
];

export const categories: Category[] = ["교통", "음식", "사람", "일상", "기타"];
export const collectionFilters = ["전체", "혼함", "꽤 괜찮음", "이왜진", "오늘 좀 됨", "우주 개입"] as const;

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthKey(date = new Date()) {
  return localDateKey(date).slice(0, 7);
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return `${year}년 ${month}월`;
}

export function dateLabel(date = new Date()) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
}

export function shiftMonth(key: string, amount: number) {
  const [year, month] = key.split("-").map(Number);
  const next = new Date(year, month - 1 + amount, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function monthDate(key: string, day: number) {
  return `${key}-${String(day).padStart(2, "0")}`;
}

export function makeSampleRecords(now = new Date()): RecordItem[] {
  const key = monthKey(now);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const safeDay = (value: number) => Math.max(1, Math.min(lastDay, value));
  return [
    { id: "sample-23", date: monthDate(key, safeDay(7)), time: "08:42", fortuneId: 23, title: "얘가 마침 여기 있었음", outcome: "happened", category: "일상", note: "버튼 누르려 했는데 이미 열려 있었음", sample: true },
    { id: "sample-24", date: monthDate(key, safeDay(10)), time: "11:21", fortuneId: 24, title: "마지막 하나, 내가 가져감", outcome: "missed", category: "음식", note: "마지막 소금빵이 남아 있었음", sample: true },
    { id: "sample-22", date: monthDate(key, safeDay(11)), time: "14:11", fortuneId: 22, title: "신호등이 내 편이었음 (8초)", outcome: "close", category: "교통", note: "건너는 동안 계속 초록불이었음", sample: true },
    { id: "sample-21", date: monthDate(key, safeDay(12)), time: "16:33", fortuneId: 21, title: "오늘도 USB와 화해 성공", outcome: "missed", category: "일상", note: "한 번에 꽂음", sample: true },
    { id: "sample-25", date: monthDate(key, safeDay(13)), time: "18:14", fortuneId: 25, title: "배달이 예상보다 빨리 옴", outcome: "close", category: "음식", note: "예정보다 3분 빨랐음", sample: true },
    { id: "sample-26", date: monthDate(key, safeDay(14)), time: "09:17", fortuneId: 26, title: "오늘은 앞뒤를 구별했음", outcome: "missed", category: "일상", note: "충전선을 한 번에 꽂음", sample: true },
  ];
}

export function fortuneFor(id: number) {
  return fortunes.find((item) => item.id === id) ?? fortunes[0];
}
