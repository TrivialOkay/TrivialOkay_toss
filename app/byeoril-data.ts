export type Tab = "today" | "collection" | "records" | "about";
export type View = "main" | "capture" | "card" | "report" | "examples" | "guide";
export type Outcome = "happened" | "close" | "missed";
export type Category = "교통" | "음식" | "사람" | "일상" | "기타";
export type CharacterArt =
  | "umbrella"
  | "coffee"
  | "fries"
  | "message"
  | "bus"
  | "resting"
  | "breadHug"
  | "crosswalk"
  | "usb"
  | "socks"
  | "alarm"
  | "samgak"
  | "microwave"
  | "sticker"
  | "vending"
  | "tape";
export type AssetKind =
  | "usb"
  | "signal"
  | "elevator"
  | "bread"
  | "delivery"
  | "cable"
  | "umbrella"
  | "coffee"
  | "bus"
  | "earbuds"
  | "fries"
  | "laundry"
  | "receipt"
  | "mascot"
  | "key"
  | "book"
  | "snack"
  | "coin"
  | "alarm"
  | "pen";

export type Fortune = {
  id: number;
  title: string;
  cardTitle: string;
  copy: string;
  aside: string;
  asset: AssetKind;
  characterArt?: CharacterArt;
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
    characterArt: "breadHug",
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
    characterArt: "usb",
    category: "일상",
  },
  {
    id: 22,
    title: "신호등이 건너는 동안 계속 초록일 수도 있습니다.",
    cardTitle: "신호등이 내 편이었음 (8초)",
    copy: "도시 전체가 도운 것은 아니지만, 적어도 이 교차로는 당신 편이었습니다.",
    aside: "8초 동안\n초록빛 번.",
    asset: "signal",
    characterArt: "crosswalk",
    category: "교통",
  },
  {
    id: 27,
    title: "비가 오기 직전에 우산을 챙긴 자신을 발견할 수도 있습니다.",
    cardTitle: "비 오기 1분 전에 우산 챙김",
    copy: "기상청보다 빨랐던 건 아니고, 오늘만큼은 가방 속 우산을 기억해냈습니다.",
    aside: "오늘의 나\n제법 준비됨.",
    asset: "umbrella",
    characterArt: "umbrella",
    category: "일상",
  },
  {
    id: 28,
    title: "카페 쿠폰 도장이 오늘 딱 다 찰 수도 있습니다.",
    cardTitle: "커피 한 잔이 공짜가 됨",
    copy: "그동안 마신 커피가 드디어 한 잔으로 돌아왔습니다. 작지만 확실한 회수입니다.",
    aside: "이건 과거의\n내가 샀다.",
    asset: "coffee",
    characterArt: "coffee",
    category: "음식",
  },
  {
    id: 29,
    title: "버스에 타자마자 빈자리가 보일 수도 있습니다.",
    cardTitle: "타자마자 내 자리가 있었음",
    copy: "누가 비워둔 건 아니지만 앉는 순간만큼은 도시가 당신 편이었습니다.",
    aside: "출발 전에\n착석 완료.",
    asset: "bus",
    characterArt: "bus",
    category: "교통",
  },
  {
    id: 30,
    title: "이어폰이 주머니에서 얌전히 나올 수도 있습니다.",
    cardTitle: "이어폰이 안 엉켜 있었음",
    copy: "주머니 안에서 무슨 일이 있었는지는 몰라도 오늘은 평화 협정이 유지됐습니다.",
    aside: "서로 싸우지\n않았구나.",
    asset: "earbuds",
    category: "일상",
  },
  {
    id: 31,
    title: "감자튀김 봉투 밑에서 하나를 더 찾을 수도 있습니다.",
    cardTitle: "끝난 줄 알았는데 감튀 하나 더",
    copy: "세상을 구할 양은 아니지만 마지막 한 입이 하루를 조금 연장했습니다.",
    aside: "너 거기\n있었구나!",
    asset: "fries",
    characterArt: "fries",
    category: "음식",
  },
  {
    id: 32,
    title: "세탁한 양말의 짝이 한 번에 맞을 수도 있습니다.",
    cardTitle: "양말 짝을 바로 맞춤",
    copy: "사라진 양말의 미스터리는 오늘만 휴업입니다. 두 짝 모두 무사합니다.",
    aside: "오늘은\n둘이 같이 옴.",
    asset: "laundry",
    characterArt: "socks",
    category: "일상",
  },
  {
    id: 33,
    title: "결제 금액이 기분 좋게 딱 떨어질 수도 있습니다.",
    cardTitle: "결제 금액이 딱 떨어짐",
    copy: "통장 잔고까지 깔끔해진 건 아니지만 숫자 모양만큼은 마음에 듭니다.",
    aside: "0원이\n줄 맞췄다.",
    asset: "receipt",
    category: "기타",
  },
  {
    id: 34,
    title: "생각하던 친구에게 먼저 연락이 올 수도 있습니다.",
    cardTitle: "생각난 친구한테 먼저 연락 옴",
    copy: "텔레파시까지는 아니고 비슷한 시간에 서로 심심했던 것 같습니다.",
    aside: "나도 방금\n생각했는데.",
    asset: "mascot",
    characterArt: "message",
    category: "사람",
  },
  {
    id: 35,
    title: "가방 속 열쇠가 한 번에 손에 잡힐 수도 있습니다.",
    cardTitle: "열쇠를 한 번에 찾아냄",
    copy: "가방 정리를 잘한 결과는 아닐 확률이 높지만 손끝의 촉이 정확했습니다.",
    aside: "오늘은\n바로 잡힘.",
    asset: "key",
    category: "일상",
  },
  {
    id: 36,
    title: "책을 펼쳤는데 찾던 페이지가 나올 수도 있습니다.",
    cardTitle: "펼치자마자 찾던 페이지였음",
    copy: "책갈피 없이도 도착했습니다. 기억력보다 우연의 활약이 조금 컸습니다.",
    aside: "여기였네.\n한 번에 찾음.",
    asset: "book",
    category: "기타",
  },
  {
    id: 37,
    title: "과자 봉지에서 유난히 큰 조각을 발견할 수도 있습니다.",
    cardTitle: "과자 왕건이를 발견함",
    copy: "양이 늘어난 건 아니지만 마지막까지 남겨두고 싶은 조각을 얻었습니다.",
    aside: "이건 조금\n아껴 먹자.",
    asset: "snack",
    category: "음식",
  },
  {
    id: 38,
    title: "주머니에서 잊고 있던 동전을 발견할 수도 있습니다.",
    cardTitle: "주머니에서 500원 나옴",
    copy: "원래 당신 돈이었지만 다시 만난 순간만큼은 공돈처럼 반갑습니다.",
    aside: "과거의 내가\n용돈을 줌.",
    asset: "coin",
    category: "기타",
  },
  {
    id: 39,
    title: "버스에서 내릴 문 바로 앞에 앉게 될 수도 있습니다.",
    cardTitle: "내릴 때 세 걸음만 걸었음",
    copy: "좋은 자리는 아니어도 내릴 때만큼은 가장 효율적인 자리였습니다.",
    aside: "하차 동선\n완벽.",
    asset: "bus",
    characterArt: "bus",
    category: "교통",
  },
  {
    id: 40,
    title: "실내에 들어가자마자 비가 잠깐 그칠 수도 있습니다.",
    cardTitle: "들어오자마자 비가 그침",
    copy: "비를 멈춘 건 아니지만 가장 젖을 구간은 기가 막히게 피했습니다.",
    aside: "타이밍만큼은\n맑음.",
    asset: "umbrella",
    characterArt: "umbrella",
    category: "일상",
  },
  {
    id: 41,
    title: "카페에 앉자마자 주문한 음료가 나올 수도 있습니다.",
    cardTitle: "앉자마자 내 번호 불림",
    copy: "기다릴 준비까지 마쳤는데 기다림이 먼저 퇴근해버렸습니다.",
    aside: "벌써\n나왔다고?",
    asset: "coffee",
    characterArt: "coffee",
    category: "음식",
  },
  {
    id: 42,
    title: "택배를 확인하려는 순간 도착 알림이 올 수도 있습니다.",
    cardTitle: "조회하려는데 배송 완료 뜸",
    copy: "새로고침 한 번을 아꼈습니다. 문 앞에는 생각보다 부지런한 상자가 있습니다.",
    aside: "방금\n도착했네.",
    asset: "delivery",
    category: "일상",
  },
  {
    id: 43,
    title: "빌리려던 책이 방금 반납되어 있을 수도 있습니다.",
    cardTitle: "찾던 책이 방금 돌아옴",
    copy: "누군가의 독서가 끝나는 순간 당신의 독서가 시작됐습니다.",
    aside: "기다리지\n않아도 됨.",
    asset: "book",
    category: "기타",
  },
  {
    id: 44,
    title: "알람이 울리기 1분 전에 저절로 눈을 뜰 수도 있습니다.",
    cardTitle: "알람보다 1분 먼저 일어남",
    copy: "푹 잔 증거인지는 모르겠지만 시끄러운 알람 한 번은 피했습니다.",
    aside: "내 몸에도\n시계가 있었네.",
    asset: "alarm",
    characterArt: "alarm",
    category: "일상",
  },
  {
    id: 45,
    title: "굴러간 펜이 손 닿는 곳에서 멈출 수도 있습니다.",
    cardTitle: "펜이 책상 밑까지 안 감",
    copy: "허리를 완전히 숙이지 않아도 되는 거리에서 작은 탈주가 끝났습니다.",
    aside: "거기서\n멈춰줘서 고맙.",
    asset: "pen",
    category: "일상",
  },
  {
    id: 46,
    title: "빵집에서 방금 나온 따뜻한 빵을 만날 수도 있습니다.",
    cardTitle: "빵이 아직 따뜻했음",
    copy: "빵이 당신을 기다린 건 아니지만 가장 포근할 때 안아 들었습니다.",
    aside: "손난로보다\n맛있는 온도.",
    asset: "bread",
    characterArt: "breadHug",
    category: "음식",
  },
  {
    id: 47,
    title: "횡단보도 앞에 서자마자 초록불이 켜질 수도 있습니다.",
    cardTitle: "서자마자 초록불 됨",
    copy: "달려오지 않아도 되는 날이 드물게 있습니다. 오늘은 도시가 타이밍을 맞췄습니다.",
    aside: "숨 고를 새도\n없이 출발.",
    asset: "signal",
    characterArt: "crosswalk",
    category: "교통",
  },
  {
    id: 48,
    title: "USB 방향을 고민하지 않고 바로 맞힐 수도 있습니다.",
    cardTitle: "USB 방향을 감으로 맞춤",
    copy: "과학적 근거는 없지만 오늘의 손목에는 미세한 방향 감각이 있었습니다.",
    aside: "뒤집을 필요\n없었다!",
    asset: "usb",
    characterArt: "usb",
    category: "일상",
  },
  {
    id: 49,
    title: "건조기 속 양말이 한 짝도 사라지지 않을 수도 있습니다.",
    cardTitle: "양말 전원이 무사 귀환함",
    copy: "세탁기의 비밀 통로는 오늘 쉬는 날입니다. 모든 짝이 집으로 돌아왔습니다.",
    aside: "오늘은\n실종자 없음.",
    asset: "laundry",
    characterArt: "socks",
    category: "일상",
  },
  {
    id: 50,
    title: "알람을 한 번만 끄고 바로 일어날 수도 있습니다.",
    cardTitle: "알람 한 번에 몸을 일으킴",
    copy: "다섯 번의 다시 알림이 할 일을 잃었습니다. 이 정도면 아침의 작은 승리입니다.",
    aside: "다시 알림은\n오늘 휴무.",
    asset: "alarm",
    characterArt: "alarm",
    category: "일상",
  },
  {
    id: 51,
    title: "삼각김밥 포장지가 김 한 장 안 찢어지고 벗겨질 수도 있습니다.",
    cardTitle: "삼각김밥 포장 완벽 해체",
    copy: "설명서대로 했는데 진짜 설명서대로 됐습니다. 김까지 온전하니 오늘 손끝은 꽤 믿을 만합니다.",
    aside: "김 한 장도\n안 찢어짐.",
    asset: "snack",
    characterArt: "samgak",
    category: "음식",
  },
  {
    id: 52,
    title: "전자레인지가 멈췄을 때 컵 손잡이가 정면을 볼 수도 있습니다.",
    cardTitle: "컵 손잡이가 나를 보고 멈춤",
    copy: "뜨거운 컵을 돌려 잡는 마지막 수고까지 생략됐습니다. 회전판이 오늘만큼은 눈치가 있습니다.",
    aside: "돌아서 잡을\n필요 없음.",
    asset: "coffee",
    characterArt: "microwave",
    category: "일상",
  },
  {
    id: 53,
    title: "스티커가 모서리 하나 뜯기지 않고 통째로 떨어질 수도 있습니다.",
    cardTitle: "스티커를 한 번에 완벽 제거함",
    copy: "끈적이도 찢어진 조각도 남지 않았습니다. 괜히 한 번 더 매끈한 자리를 쓰다듬게 됩니다.",
    aside: "흔적도 없이\n깔끔.",
    asset: "receipt",
    characterArt: "sticker",
    category: "일상",
  },
  {
    id: 54,
    title: "자판기 버튼을 누르자마자 음료가 바로 떨어질 수도 있습니다.",
    cardTitle: "자판기가 고민 없이 음료 줌",
    copy: "웅— 하는 뜸도 없이 바로 쿵. 기계와 마음이 통한 건 아니지만 대답은 아주 빨랐습니다.",
    aside: "쿵 소리까지\n즉답.",
    asset: "delivery",
    characterArt: "vending",
    category: "음식",
  },
  {
    id: 55,
    title: "택배 상자 테이프 시작점을 손톱으로 한 번에 찾을 수도 있습니다.",
    cardTitle: "테이프 시작점을 바로 찾음",
    copy: "상자를 빙빙 돌릴 필요도, 손톱으로 온 표면을 긁을 필요도 없었습니다. 개봉까지 단 3초.",
    aside: "뜯는 데\n3초.",
    asset: "delivery",
    characterArt: "tape",
    category: "일상",
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
  { grade: "오늘 좀 됨", stars: 4, copy: "진짜 드문 일. 자랑해도 됩니다." },
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
    { id: "sample-51", date: monthDate(key, safeDay(1)), time: "12:04", fortuneId: 51, title: "삼각김밥 포장 완벽 해체", outcome: "happened", category: "음식", note: "김 한 장도 안 찢어지고 쏙 빠짐", sample: true },
    { id: "sample-52", date: monthDate(key, safeDay(2)), time: "19:32", fortuneId: 52, title: "컵 손잡이가 나를 보고 멈춤", outcome: "close", category: "일상", note: "문 열자 손잡이가 딱 앞에 있었음", sample: true },
    { id: "sample-53", date: monthDate(key, safeDay(3)), time: "14:48", fortuneId: 53, title: "스티커를 한 번에 완벽 제거함", outcome: "happened", category: "일상", note: "끈적이 하나 없이 통째로 떨어짐", sample: true },
    { id: "sample-54", date: monthDate(key, safeDay(4)), time: "17:05", fortuneId: 54, title: "자판기가 고민 없이 음료 줌", outcome: "happened", category: "음식", note: "버튼 누르자마자 바로 쿵 소리 남", sample: true },
    { id: "sample-55", date: monthDate(key, safeDay(5)), time: "18:27", fortuneId: 55, title: "테이프 시작점을 바로 찾음", outcome: "close", category: "일상", note: "상자 안 돌리고 바로 꼬리 발견", sample: true },
    { id: "sample-46", date: monthDate(key, safeDay(27)), time: "11:02", fortuneId: 46, title: "빵이 아직 따뜻했음", outcome: "happened", category: "음식", note: "봉투 너머로 따뜻함이 느껴짐", sample: true },
    { id: "sample-47", date: monthDate(key, safeDay(28)), time: "08:26", fortuneId: 47, title: "서자마자 초록불 됨", outcome: "close", category: "교통", note: "발 멈추자마자 초록불로 바뀜", sample: true },
    { id: "sample-48", date: monthDate(key, safeDay(29)), time: "16:44", fortuneId: 48, title: "USB 방향을 감으로 맞춤", outcome: "happened", category: "일상", note: "확인도 안 하고 꽂았는데 맞았음", sample: true },
    { id: "sample-49", date: monthDate(key, safeDay(30)), time: "20:13", fortuneId: 49, title: "양말 전원이 무사 귀환함", outcome: "close", category: "일상", note: "세탁 끝나고 짝이 전부 맞았음", sample: true },
    { id: "sample-50", date: monthDate(key, safeDay(31)), time: "07:01", fortuneId: 50, title: "알람 한 번에 몸을 일으킴", outcome: "missed", category: "일상", note: "다시 알림 안 누르고 일어남", sample: true },
    { id: "sample-37", date: monthDate(key, safeDay(18)), time: "15:11", fortuneId: 37, title: "과자 왕건이를 발견함", outcome: "happened", category: "음식", note: "봉지 안에 큰 조각 하나 남아 있었음", sample: true },
    { id: "sample-38", date: monthDate(key, safeDay(19)), time: "10:27", fortuneId: 38, title: "주머니에서 500원 나옴", outcome: "close", category: "기타", note: "겨울 주머니에서 동전 발견", sample: true },
    { id: "sample-39", date: monthDate(key, safeDay(20)), time: "08:03", fortuneId: 39, title: "내릴 때 세 걸음만 걸었음", outcome: "happened", category: "교통", note: "하차문 바로 앞자리에 앉음", sample: true },
    { id: "sample-40", date: monthDate(key, safeDay(21)), time: "17:46", fortuneId: 40, title: "들어오자마자 비가 그침", outcome: "missed", category: "일상", note: "우산 접자마자 빗소리가 멈춤", sample: true },
    { id: "sample-41", date: monthDate(key, safeDay(22)), time: "13:19", fortuneId: 41, title: "앉자마자 내 번호 불림", outcome: "happened", category: "음식", note: "진동벨 내려놓자마자 울림", sample: true },
    { id: "sample-42", date: monthDate(key, safeDay(23)), time: "18:52", fortuneId: 42, title: "조회하려는데 배송 완료 뜸", outcome: "close", category: "일상", note: "택배 앱 켜자마자 도착 알림 옴", sample: true },
    { id: "sample-43", date: monthDate(key, safeDay(24)), time: "14:08", fortuneId: 43, title: "찾던 책이 방금 돌아옴", outcome: "happened", category: "기타", note: "검색 중에 대출 가능으로 바뀜", sample: true },
    { id: "sample-44", date: monthDate(key, safeDay(25)), time: "06:59", fortuneId: 44, title: "알람보다 1분 먼저 일어남", outcome: "close", category: "일상", note: "알람 끄려고 보니 1분 남았음", sample: true },
    { id: "sample-45", date: monthDate(key, safeDay(26)), time: "16:05", fortuneId: 45, title: "펜이 책상 밑까지 안 감", outcome: "missed", category: "일상", note: "발끝 바로 앞에서 멈춤", sample: true },
    { id: "sample-23", date: monthDate(key, safeDay(7)), time: "08:42", fortuneId: 23, title: "얘가 마침 여기 있었음", outcome: "happened", category: "일상", note: "버튼 누르려 했는데 이미 열려 있었음", sample: true },
    { id: "sample-27", date: monthDate(key, safeDay(8)), time: "07:48", fortuneId: 27, title: "비 오기 1분 전에 우산 챙김", outcome: "happened", category: "일상", note: "나오자마자 비가 왔는데 우산 있었음", sample: true },
    { id: "sample-24", date: monthDate(key, safeDay(10)), time: "11:21", fortuneId: 24, title: "마지막 하나, 내가 가져감", outcome: "missed", category: "음식", note: "마지막 소금빵이 남아 있었음", sample: true },
    { id: "sample-28", date: monthDate(key, safeDay(9)), time: "13:06", fortuneId: 28, title: "커피 한 잔이 공짜가 됨", outcome: "close", category: "음식", note: "쿠폰 도장이 딱 열 개 됨", sample: true },
    { id: "sample-22", date: monthDate(key, safeDay(11)), time: "14:11", fortuneId: 22, title: "신호등이 내 편이었음 (8초)", outcome: "close", category: "교통", note: "건너는 동안 계속 초록불이었음", sample: true },
    { id: "sample-29", date: monthDate(key, safeDay(6)), time: "08:18", fortuneId: 29, title: "타자마자 내 자리가 있었음", outcome: "happened", category: "교통", note: "문 앞에 빈자리 하나 있었음", sample: true },
    { id: "sample-21", date: monthDate(key, safeDay(12)), time: "16:33", fortuneId: 21, title: "오늘도 USB와 화해 성공", outcome: "missed", category: "일상", note: "한 번에 꽂음", sample: true },
    { id: "sample-30", date: monthDate(key, safeDay(5)), time: "09:31", fortuneId: 30, title: "이어폰이 안 엉켜 있었음", outcome: "close", category: "일상", note: "주머니에서 그대로 나옴", sample: true },
    { id: "sample-25", date: monthDate(key, safeDay(13)), time: "18:14", fortuneId: 25, title: "배달이 예상보다 빨리 옴", outcome: "close", category: "음식", note: "예정보다 3분 빨랐음", sample: true },
    { id: "sample-31", date: monthDate(key, safeDay(4)), time: "17:22", fortuneId: 31, title: "끝난 줄 알았는데 감튀 하나 더", outcome: "happened", category: "음식", note: "봉투 구석에서 하나 찾음", sample: true },
    { id: "sample-26", date: monthDate(key, safeDay(14)), time: "09:17", fortuneId: 26, title: "오늘은 앞뒤를 구별했음", outcome: "missed", category: "일상", note: "충전선을 한 번에 꽂음", sample: true },
    { id: "sample-32", date: monthDate(key, safeDay(3)), time: "20:04", fortuneId: 32, title: "양말 짝을 바로 맞춤", outcome: "close", category: "일상", note: "한 짝도 안 사라짐", sample: true },
    { id: "sample-33", date: monthDate(key, safeDay(2)), time: "12:30", fortuneId: 33, title: "결제 금액이 딱 떨어짐", outcome: "missed", category: "기타", note: "총액이 12,000원이었음", sample: true },
    { id: "sample-34", date: monthDate(key, safeDay(15)), time: "21:09", fortuneId: 34, title: "생각난 친구한테 먼저 연락 옴", outcome: "happened", category: "사람", note: "메시지 보내려는데 먼저 옴", sample: true },
    { id: "sample-35", date: monthDate(key, safeDay(16)), time: "10:42", fortuneId: 35, title: "열쇠를 한 번에 찾아냄", outcome: "close", category: "일상", note: "가방 깊숙한 데서 바로 잡힘", sample: true },
    { id: "sample-36", date: monthDate(key, safeDay(17)), time: "22:16", fortuneId: 36, title: "펼치자마자 찾던 페이지였음", outcome: "happened", category: "기타", note: "책갈피 없이 한 번에 찾음", sample: true },
  ];
}

export function fortuneFor(id: number) {
  return fortunes.find((item) => item.id === id) ?? fortunes[0];
}
