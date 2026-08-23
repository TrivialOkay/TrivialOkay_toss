export type Tab = "today" | "collection" | "records" | "about";
export type View = "main" | "capture" | "card" | "report" | "examples" | "guide" | "settings" | "wakppu";
export type Outcome = "happened" | "close" | "missed";
export type Category = "교통" | "음식" | "사람" | "일상" | "기타";
export type HiddenCardId = "swift-slice" | "stellar-overcharge" | "quantum-entanglement" | "abracada-crack" | "mirror-dimension" | "gravity-reversal";
export type HiddenCard = {
  id: HiddenCardId;
  code: string;
  title: string;
  label: string;
  copy: string;
  hint: string;
  symbol: string;
};
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
  | "tape"
  | "soda"
  | "cupnoodle"
  | "onePercent"
  | "fourcut"
  | "shuffle"
  | "tteokPair"
  | "perfectEgg"
  | "hoodieStrings"
  | "strawFirst"
  | "oneTissue"
  | "bellEscape"
  | "cleanIcepop"
  | "straightSnack"
  | "drySleeves"
  | "tiedLaces"
  | "cleanZipper"
  | "umbrellaSleeve"
  | "pencilClick"
  | "evenChopsticks"
  | "tangerineSpiral"
  | "cleanYogurt"
  | "neatSauce"
  | "oneIce"
  | "eraserBall"
  | "openBag"
  | "cardSleeve"
  | "fullEarbuds"
  | "oneStaple"
  | "cookieRescue"
  | "spoonBridge"
  | "sheetCorner"
  | "cleanPopcorn"
  | "twinToast"
  | "oneShampoo"
  | "cleanSeasoning"
  | "peaToothpaste"
  | "readySlippers"
  | "soloDumpling"
  | "softPhone"
  | "shoePebble"
  | "cableDodge"
  | "cleanCorrection"
  | "flatBandage"
  | "wristHairtie"
  | "cleanPizza"
  | "firstPop"
  | "exactCable"
  | "strapEscape";
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

export const hiddenCards: HiddenCard[] = [
  {
    id: "swift-slice",
    code: "SP.01",
    title: "슥— 한방컷",
    label: "초고속 절단 신호",
    copy: "빠른 궤적 하나로 왁뿌볼을 단번에 절단했습니다.",
    hint: "왁뿌볼을 빠르게 한 획으로 베어보세요.",
    symbol: "╱",
  },
  {
    id: "stellar-overcharge",
    code: "SP.02",
    title: "별빛 과충전",
    label: "장시간 응축 신호",
    copy: "숨겨진 별빛을 끝까지 응축해 특수 파괴를 일으켰습니다.",
    hint: "왁뿌볼을 길게 눌러 별빛을 모아보세요.",
    symbol: "✦",
  },
  {
    id: "quantum-entanglement",
    code: "SP.03",
    title: "양자 얽힘",
    label: "이중 접촉 동기화",
    copy: "멀리 떨어진 두 손가락이 동시에 반응해 왁뿌볼의 상태를 하나로 묶었습니다.",
    hint: "두 손가락으로 왁뿌볼을 동시에 눌러보세요.",
    symbol: "∞",
  },
  {
    id: "abracada-crack",
    code: "SP.04",
    title: "아브라다-깨다브라",
    label: "번개 궤적 주문",
    copy: "어딘가 익숙하지만 법적으로는 다른 주문이 왁뿌볼에 금을 냈습니다.",
    hint: "왁뿌볼 위에 번개처럼 꺾인 선을 그려보세요.",
    symbol: "ϟ",
  },
  {
    id: "mirror-dimension",
    code: "SP.05",
    title: "미러 디멘션 개방",
    label: "원형 시공간 신호",
    copy: "손끝의 원이 접힌 공간을 열어 왁뿌볼을 다른 차원에서 깨뜨렸습니다.",
    hint: "왁뿌볼 둘레를 크게 한 바퀴 그려보세요.",
    symbol: "◎",
  },
  {
    id: "gravity-reversal",
    code: "SP.06",
    title: "중력 역전",
    label: "상향 가속 신호",
    copy: "아래로 떨어질 운명이던 왁뿌볼을 위로 날려 우주의 방향 감각을 잠깐 망가뜨렸습니다.",
    hint: "왁뿌볼을 아래에서 위로 빠르게 밀어올려 보세요.",
    symbol: "↑",
  },
];

export function hiddenCardFor(id: HiddenCardId) {
  return hiddenCards.find((card) => card.id === id) ?? hiddenCards[0];
}

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
  {
    id: 56,
    title: "탄산을 열었는데 거품이 입구에서 딱 멈출 수도 있습니다.",
    cardTitle: "탄산 거품이 선을 지킴",
    copy: "넘친다고 확신한 순간 거품이 스스로 멈췄습니다. 닦을 휴지를 찾던 손이 할 일을 잃었습니다.",
    aside: "넘칠 듯하다\n안 넘침.",
    asset: "snack",
    characterArt: "soda",
    category: "음식",
  },
  {
    id: 57,
    title: "컵라면 뚜껑이 젓가락 없이도 끝까지 얌전히 붙어 있을 수도 있습니다.",
    cardTitle: "컵라면 뚜껑이 혼자 버팀",
    copy: "포크도 휴대폰도 올리지 않았는데 뚜껑이 제 책임을 다했습니다. 면보다 먼저 익은 건 신뢰입니다.",
    aside: "3분 동안\n자리 안 뜸.",
    asset: "snack",
    characterArt: "cupnoodle",
    category: "음식",
  },
  {
    id: 58,
    title: "배터리 1%로 집 충전기 앞까지 무사히 도착할 수도 있습니다.",
    cardTitle: "배터리 1%가 집까지 버팀",
    copy: "꺼질 듯 말 듯 빨간 한 칸이 현관까지 따라왔습니다. 오늘의 휴대폰은 마지막 의리가 있었습니다.",
    aside: "충전기 앞에서\n임무 완료.",
    asset: "cable",
    characterArt: "onePercent",
    category: "일상",
  },
  {
    id: 59,
    title: "네 컷 사진 네 장에서 모두 눈을 뜨고 있을 수도 있습니다.",
    cardTitle: "네 컷 모두 두 눈 생존",
    copy: "한 장쯤 감겼을 법한데 네 번의 셔터를 전부 이겨냈습니다. 버릴 칸이 없어서 오히려 곤란합니다.",
    aside: "네 장 전부\n눈 뜸.",
    asset: "receipt",
    characterArt: "fourcut",
    category: "사람",
  },
  {
    id: 60,
    title: "랜덤 재생 첫 곡이 지금 딱 듣고 싶던 노래일 수도 있습니다.",
    cardTitle: "랜덤 재생이 마음을 읽음",
    copy: "수백 곡 중 하필 그 곡부터 나왔습니다. 알고리즘이 아니라 잠깐의 텔레파시였다고 해둡시다.",
    aside: "첫 곡부터\n선곡 성공.",
    asset: "earbuds",
    characterArt: "shuffle",
    category: "기타",
  },
  {
    id: 61,
    title: "떡볶이 떡 두 개가 나란히 붙어서 한 번에 집힐 수도 있습니다.",
    cardTitle: "떡볶이에서 쌍떡 발견",
    copy: "한 번 찍었는데 두 개가 따라왔습니다. 양이 늘어난 건 아니어도 한입의 기세는 두 배입니다.",
    aside: "한 번 집고\n두 개 획득.",
    asset: "snack",
    characterArt: "tteokPair",
    category: "음식",
  },
  {
    id: 62,
    title: "삶은 달걀 껍질이 한 번에 크게 벗겨질 수도 있습니다.",
    cardTitle: "삶은 달걀이 매끈하게 벗겨짐",
    copy: "흰자 한 점 희생하지 않고 껍질만 두 조각으로 갈라졌습니다. 달걀 표면이 괜히 자랑스럽습니다.",
    aside: "흰자 손실\n0그램.",
    asset: "snack",
    characterArt: "perfectEgg",
    category: "음식",
  },
  {
    id: 63,
    title: "후드 끈 양쪽 길이가 처음부터 정확히 같을 수도 있습니다.",
    cardTitle: "후드 끈 길이가 완벽 대칭",
    copy: "한쪽을 당기면 반대쪽이 도망가던 균형 싸움이 오늘은 없었습니다. 목 아래에 작은 평화가 왔습니다.",
    aside: "당길 필요\n없었음.",
    asset: "laundry",
    characterArt: "hoodieStrings",
    category: "일상",
  },
  {
    id: 64,
    title: "종이 빨대가 첫 시도에 뚜껑 구멍을 정확히 통과할 수도 있습니다.",
    cardTitle: "빨대가 첫 시도에 중앙 적중",
    copy: "빨대 끝이 구겨지지도, 옆으로 미끄러지지도 않았습니다. 오늘의 조준은 음료 한 잔만큼 정확합니다.",
    aside: "빨대 끝도\n멀쩡.",
    asset: "coffee",
    characterArt: "strawFirst",
    category: "음식",
  },
  {
    id: 65,
    title: "휴지를 뽑았는데 딱 한 장만 깔끔하게 따라올 수도 있습니다.",
    cardTitle: "휴지가 정확히 한 장만 나옴",
    copy: "두 장이 붙어 나오지도, 반쯤 찢어지지도 않았습니다. 필요한 만큼만 나온 드문 절제의 순간입니다.",
    aside: "뒤에 한 장도\n안 딸려옴.",
    asset: "receipt",
    characterArt: "oneTissue",
    category: "일상",
  },
  {
    id: 66,
    title: "랜덤 발표가 내 차례 바로 전에 종이 울려 끝날 수도 있습니다.",
    cardTitle: "내 차례 직전에 수업 끝남",
    copy: "이름이 불리기 직전 종소리가 먼저 교실을 구했습니다. 준비한 말은 다음 시간까지 안전하게 보관됩니다.",
    aside: "다음 타자였는데\n살았다.",
    asset: "alarm",
    characterArt: "bellEscape",
    category: "사람",
  },
  {
    id: 67,
    title: "아이스바가 손에 흐르기 전에 마지막 한입까지 먹을 수도 있습니다.",
    cardTitle: "아이스바를 깨끗하게 완주함",
    copy: "손가락에 끈적임 한 방울 없이 막대만 남았습니다. 더위와의 짧은 경기에서 아주 깔끔하게 이겼습니다.",
    aside: "손에 한 방울도\n안 묻음.",
    asset: "snack",
    characterArt: "cleanIcepop",
    category: "음식",
  },
  {
    id: 68,
    title: "과자 봉지가 대각선으로 찢어지지 않고 일자로 열릴 수도 있습니다.",
    cardTitle: "과자 봉지가 일자로 열림",
    copy: "뜯는 방향이 옆길로 새지 않고 모서리부터 모서리까지 반듯하게 갔습니다. 오늘의 손끝에는 자가 숨어 있었습니다.",
    aside: "가위 없이도\n직선 성공.",
    asset: "snack",
    characterArt: "straightSnack",
    category: "음식",
  },
  {
    id: 69,
    title: "손을 씻는 동안 걷어 올린 소매가 한 방울도 젖지 않을 수도 있습니다.",
    cardTitle: "손 씻고도 소매가 뽀송함",
    copy: "물줄기도 튄 물방울도 소매 선을 넘지 못했습니다. 축축한 손목 없이 하루를 계속할 수 있습니다.",
    aside: "양쪽 소매\n모두 생존.",
    asset: "laundry",
    characterArt: "drySleeves",
    category: "일상",
  },
  {
    id: 70,
    title: "아침에 묶은 운동화 끈이 하루 종일 한 번도 풀리지 않을 수도 있습니다.",
    cardTitle: "운동화 끈이 하루 종일 버팀",
    copy: "걷고 뛰고 계단을 올라가도 매듭이 자기 자리를 지켰습니다. 허리를 숙일 일이 하나 줄었습니다.",
    aside: "다시 묶기\n0회.",
    asset: "bus",
    characterArt: "tiedLaces",
    category: "일상",
  },
  {
    id: 71,
    title: "가방 지퍼가 안감을 물지 않고 한 번에 닫힐 수도 있습니다.",
    cardTitle: "가방 지퍼가 천을 안 물음",
    copy: "중간에 덜컥 멈추지도, 안감을 다시 빼내지도 않았습니다. 처음부터 끝까지 매끈한 완주였습니다.",
    aside: "지퍼가 오늘\n얌전함.",
    asset: "delivery",
    characterArt: "cleanZipper",
    category: "일상",
  },
  {
    id: 72,
    title: "접은 우산이 우산집에 첫 시도부터 쏙 들어갈 수도 있습니다.",
    cardTitle: "우산이 우산집에 한 번에 들어감",
    copy: "접힌 천이 옆으로 삐져나오지 않고 가장 좁은 입구를 단번에 통과했습니다. 비 오는 날의 마무리까지 깔끔합니다.",
    aside: "돌려 넣기\n필요 없음.",
    asset: "umbrella",
    characterArt: "umbrellaSleeve",
    category: "일상",
  },
  {
    id: 73,
    title: "샤프심을 채우자 첫 클릭부터 심이 바로 나올 수도 있습니다.",
    cardTitle: "샤프심이 첫 클릭에 나옴",
    copy: "몇 번이나 딸깍거릴 준비를 했는데 한 번으로 끝났습니다. 새 심도 부러지지 않고 곧게 출근했습니다.",
    aside: "딸깍 한 번에\n준비 완료.",
    asset: "pen",
    characterArt: "pencilClick",
    category: "일상",
  },
  {
    id: 74,
    title: "나무젓가락이 양쪽 똑같이 갈라질 수도 있습니다.",
    cardTitle: "나무젓가락이 정확히 반으로 갈라짐",
    copy: "한쪽에 나무 살점이 몰리지 않고 두 짝 모두 반듯하게 독립했습니다. 왼손도 오른손도 서운할 일이 없습니다.",
    aside: "왼쪽 오른쪽\n둘 다 젓가락.",
    asset: "snack",
    characterArt: "evenChopsticks",
    category: "음식",
  },
  {
    id: 75,
    title: "귤껍질이 중간에 끊기지 않고 한 줄로 이어질 수도 있습니다.",
    cardTitle: "귤껍질이 한 줄로 이어짐",
    copy: "꼭지부터 마지막 조각까지 하나의 긴 리본으로 살아남았습니다. 먹는 시간보다 껍질 구경이 조금 더 길어졌습니다.",
    aside: "끊긴 횟수\n0번.",
    asset: "snack",
    characterArt: "tangerineSpiral",
    category: "음식",
  },
  {
    id: 76,
    title: "요거트 뚜껑에 한 방울도 안 묻어 있을 수도 있습니다.",
    cardTitle: "요거트 뚜껑이 깨끗함",
    copy: "핥을 것도 닦을 것도 없이 은박 뚜껑이 새것처럼 나왔습니다. 손가락에 묻을 예정이던 요거트까지 전부 컵 안에 있습니다.",
    aside: "뚜껑 핥기\n오늘은 휴무.",
    asset: "snack",
    characterArt: "cleanYogurt",
    category: "음식",
  },
  {
    id: 77,
    title: "소스가 손에 안 묻고 음식 위에만 착륙할 수도 있습니다.",
    cardTitle: "소스가 음식에만 정확히 묻음",
    copy: "봉지 옆구리도 손가락도 깨끗한 채 소스가 목표물 중앙에만 내려앉았습니다. 물티슈 한 장을 아꼈습니다.",
    aside: "손가락은\n무사함.",
    asset: "snack",
    characterArt: "neatSauce",
    category: "음식",
  },
  {
    id: 78,
    title: "얼음틀을 비틀었는데 얼음이 딱 한 알만 나올 수도 있습니다.",
    cardTitle: "얼음이 딱 한 알만 나옴",
    copy: "우르르 쏟아지지도 바닥으로 도망가지도 않고 필요한 한 알만 손바닥에 도착했습니다. 나머지는 얌전히 대기 중입니다.",
    aside: "얼음 폭주\n없었음.",
    asset: "coffee",
    characterArt: "oneIce",
    category: "음식",
  },
  {
    id: 79,
    title: "지우개 가루가 한 번에 동그랗게 뭉칠 수도 있습니다.",
    cardTitle: "지우개 가루를 한 덩이로 합침",
    copy: "책상 위에 흩어진 가루들이 손가락 한 번에 조그만 눈덩이가 됐습니다. 버리기 전까지 괜히 굴려 보게 됩니다.",
    aside: "가루들도\n단체 행동.",
    asset: "pen",
    characterArt: "eraserBall",
    category: "일상",
  },
  {
    id: 80,
    title: "비닐봉지 입구가 손가락 한 번에 열릴 수도 있습니다.",
    cardTitle: "비닐봉지가 바로 입을 열어줌",
    copy: "양쪽 면이 끝까지 붙어 버티지 않고 첫 손길에 순순히 갈라졌습니다. 손가락에 입김을 불 일도 없었습니다.",
    aside: "비비기\n1초 컷.",
    asset: "delivery",
    characterArt: "openBag",
    category: "일상",
  },
  {
    id: 81,
    title: "포토카드가 모서리 안 걸리고 슬리브에 쏙 들어갈 수도 있습니다.",
    cardTitle: "포토카드가 슬리브에 첫입장 성공",
    copy: "네 모서리 어디 하나 접히거나 걸리지 않고 투명한 집에 곧게 들어갔습니다. 소중한 종이의 입주가 평화로웠습니다.",
    aside: "모서리 네 곳\n전원 무사.",
    asset: "receipt",
    characterArt: "cardSleeve",
    category: "기타",
  },
  {
    id: 82,
    title: "양쪽 무선 이어폰이 동시에 가득 충전되어 있을 수도 있습니다.",
    cardTitle: "양쪽 이어폰이 나란히 완충됨",
    copy: "한쪽만 몰래 방전된 반전 없이 두 알 모두 같은 컨디션으로 기다리고 있었습니다. 오늘은 어느 귀도 차별받지 않습니다.",
    aside: "왼쪽 오른쪽\n둘 다 준비됨.",
    asset: "earbuds",
    characterArt: "fullEarbuds",
    category: "일상",
  },
  {
    id: 83,
    title: "스테이플러를 한 번 눌러 종이가 전부 묶일 수도 있습니다.",
    cardTitle: "스테이플러가 첫 번에 제 일 함",
    copy: "심이 비어 있지도 종이 위에서 구겨지지도 않고 한 번의 철컥으로 임무를 마쳤습니다. 두 번째 철컥은 필요 없습니다.",
    aside: "헛철컥\n0회.",
    asset: "pen",
    characterArt: "oneStaple",
    category: "일상",
  },
  {
    id: 84,
    title: "우유에 찍은 쿠키가 안 부서지고 다시 올라올 수도 있습니다.",
    cardTitle: "우유에 빠진 쿠키를 구조함",
    copy: "쿠키가 우유 속에 영구 취업하지 않고 원래 모양으로 귀환했습니다. 숟가락 구조대는 오늘 쉽니다.",
    aside: "우유 속\n실종자 0명.",
    asset: "snack",
    characterArt: "cookieRescue",
    category: "음식",
  },
  {
    id: 85,
    title: "국그릇에 걸쳐 둔 숟가락이 안으로 미끄러지지 않을 수도 있습니다.",
    cardTitle: "숟가락이 국에 잠수하지 않음",
    copy: "손잡이까지 따뜻해지는 비극 없이 양쪽 그릇 턱에서 균형을 지켰습니다. 식탁 위 작은 현수교가 완공됐습니다.",
    aside: "숟가락\n입수 취소.",
    asset: "snack",
    characterArt: "spoonBridge",
    category: "음식",
  },
  {
    id: 86,
    title: "잠자는 동안 침대 시트 모서리가 한 군데도 빠지지 않을 수도 있습니다.",
    cardTitle: "침대 시트 네 모서리가 밤새 버팀",
    copy: "아침에 일어났는데 매트리스가 배를 드러내지 않았습니다. 네 모서리가 야간 근무를 무사히 마쳤습니다.",
    aside: "밤새 탈주한\n모서리 0개.",
    asset: "laundry",
    characterArt: "sheetCorner",
    category: "일상",
  },
  {
    id: 87,
    title: "팝콘을 다 먹고도 이 사이에 껍질이 하나도 안 낄 수도 있습니다.",
    cardTitle: "팝콘 껍질이 이에 안 낌",
    copy: "혀로 치과 탐사할 일 없이 입안이 조용합니다. 영화 엔딩과 함께 팝콘도 깔끔하게 퇴장했습니다.",
    aside: "혀의 잔업\n없었음.",
    asset: "snack",
    characterArt: "cleanPopcorn",
    category: "음식",
  },
  {
    id: 88,
    title: "토스터에서 나온 식빵 두 장이 똑같은 색일 수도 있습니다.",
    cardTitle: "식빵 두 장이 같은 만큼 구워짐",
    copy: "한 장만 석양이고 다른 한 장은 새벽인 참사 없이 둘 다 같은 아침을 맞았습니다. 잼도 편을 고를 필요가 없습니다.",
    aside: "탄 쪽 찾기\n실패.",
    asset: "bread",
    characterArt: "twinToast",
    category: "음식",
  },
  {
    id: 89,
    title: "샴푸 펌프를 한 번 눌렀는데 정말 한 번 분량만 나올 수도 있습니다.",
    cardTitle: "샴푸가 한 번만큼만 나옴",
    copy: "반 펌프도 두 펌프도 아닌 계획한 만큼만 손바닥에 착륙했습니다. 머리카락보다 펌프가 먼저 철들었습니다.",
    aside: "욕심 없는\n한 펌프.",
    asset: "laundry",
    characterArt: "oneShampoo",
    category: "일상",
  },
  {
    id: 90,
    title: "라면 스프 봉지가 가루 한 톨 날리지 않고 열릴 수도 있습니다.",
    cardTitle: "라면 스프가 조용히 개봉됨",
    copy: "식탁도 손가락도 매운 먼지 없이 봉투 입구만 얌전히 열렸습니다. 재채기와의 면담은 취소됐습니다.",
    aside: "매운 안개\n발생 안 함.",
    asset: "snack",
    characterArt: "cleanSeasoning",
    category: "음식",
  },
  {
    id: 91,
    title: "치약이 칫솔 위에 콩알만큼만 나올 수도 있습니다.",
    cardTitle: "치약이 진짜 콩알만큼 나옴",
    copy: "광고처럼 길게 눕지도 세면대로 추락하지도 않고 칫솔 중앙에 작은 점으로 앉았습니다. 치약이 단위를 지켰습니다.",
    aside: "콩알과\n협의 완료.",
    asset: "pen",
    characterArt: "peaToothpaste",
    category: "일상",
  },
  {
    id: 92,
    title: "현관 슬리퍼 두 짝이 신기 좋게 바깥쪽을 보고 있을 수도 있습니다.",
    cardTitle: "슬리퍼가 먼저 외출 준비함",
    copy: "발로 돌려놓을 필요 없이 두 짝 모두 문밖을 바라보고 있었습니다. 나보다 먼저 마음은 외출 중입니다.",
    aside: "발 넣고\n바로 출발.",
    asset: "delivery",
    characterArt: "readySlippers",
    category: "일상",
  },
  {
    id: 93,
    title: "냉동만두가 서로 붙지 않고 한 개씩 떨어질 수도 있습니다.",
    cardTitle: "냉동만두가 각자 살고 있음",
    copy: "봉지를 바닥에 내려칠 필요 없이 만두들이 개인 생활을 존중하고 있었습니다. 오늘 해동할 사람만 조용히 나왔습니다.",
    aside: "만두 단체전\n취소.",
    asset: "snack",
    characterArt: "soloDumpling",
    category: "음식",
  },
  {
    id: 94,
    title: "침대에서 놓친 휴대폰이 바닥 대신 이불 위로 떨어질 수도 있습니다.",
    cardTitle: "휴대폰이 이불 위로 안전 착지함",
    copy: "심장이 먼저 바닥에 닿았지만 휴대폰은 푹신한 곳에 누웠습니다. 액정보다 이불이 먼저 받아냈습니다.",
    aside: "낙하했지만\n누운 셈.",
    asset: "mascot",
    characterArt: "softPhone",
    category: "일상",
  },
  {
    id: 95,
    title: "신발 속 작은 돌이 한 번 흔들자 바로 나올 수도 있습니다.",
    cardTitle: "신발 속 돌이 첫 흔들기에 나옴",
    copy: "분명 안쪽 어딘가로 숨을 준비였는데 한 번의 털기에 순순히 퇴장했습니다. 발바닥 수사대는 해산합니다.",
    aside: "돌멩이\n자진 퇴실.",
    asset: "mascot",
    characterArt: "shoePebble",
    category: "일상",
  },
  {
    id: 96,
    title: "의자 바퀴가 충전선을 아슬아슬하게 피해 갈 수도 있습니다.",
    cardTitle: "의자 바퀴가 충전선을 안 밟음",
    copy: "바퀴와 케이블 사이에 종이 한 장만 한 평화가 남았습니다. 충전선의 납작해질 뻔한 하루가 연장됐습니다.",
    aside: "선 하나\n목숨 건짐.",
    asset: "cable",
    characterArt: "cableDodge",
    category: "일상",
  },
  {
    id: 97,
    title: "수정테이프가 중간에 끊기지 않고 한 줄로 그어질 수도 있습니다.",
    cardTitle: "수정테이프가 한 줄로 완주함",
    copy: "뜯기지도 투명해지지도 않고 실수 위를 처음부터 끝까지 하얗게 덮었습니다. 실수는 있었지만 마감은 프로였습니다.",
    aside: "되감기 없이\n한 줄 성공.",
    asset: "pen",
    characterArt: "cleanCorrection",
    category: "일상",
  },
  {
    id: 98,
    title: "반창고가 자기 몸에 붙지 않고 얌전히 벗겨질 수도 있습니다.",
    cardTitle: "반창고가 혼자 안 접힘",
    copy: "보호 필름을 떼는 동안 끈끈한 면끼리 먼저 화해하지 않았습니다. 상처보다 반창고를 구조할 일은 없었습니다.",
    aside: "반창고끼리\n포옹 금지.",
    asset: "mascot",
    characterArt: "flatBandage",
    category: "일상",
  },
  {
    id: 99,
    title: "머리끈이 필요해진 순간 손목에 이미 걸려 있을 수도 있습니다.",
    cardTitle: "머리끈이 손목에서 발견됨",
    copy: "가방과 주머니를 뒤질 준비를 했는데 범인은 처음부터 손목에 있었습니다. 가장 가까운 곳이 마지막 수색지였습니다.",
    aside: "찾는 데\n0초.",
    asset: "laundry",
    characterArt: "wristHairtie",
    category: "일상",
  },
  {
    id: 100,
    title: "피자를 한입 먹었는데 치즈가 길게 따라오지 않고 딱 끊길 수도 있습니다.",
    cardTitle: "피자 치즈가 한입에서 깔끔히 끊김",
    copy: "치즈가 턱과 접시 사이에 현수교를 놓지 않고 제자리에서 끝났습니다. 뜨거운 치즈와의 줄다리기는 취소됐습니다.",
    aside: "치즈 꼬리\n없었음.",
    asset: "snack",
    characterArt: "cleanPizza",
    category: "음식",
  },
  {
    id: 101,
    title: "뽁뽁이 첫 번째 칸이 바로 터질 수도 있습니다.",
    cardTitle: "뽁뽁이가 첫 손가락에 뽁 함",
    copy: "눌러도 옆으로 도망가는 납작한 척하는 칸이 아니었습니다. 첫 만남에 본업을 정확히 수행했습니다.",
    aside: "첫 칸부터\n말 잘 들음.",
    asset: "delivery",
    characterArt: "firstPop",
    category: "기타",
  },
  {
    id: 102,
    title: "충전선 길이가 침대 위 휴대폰까지 딱 닿을 수도 있습니다.",
    cardTitle: "충전선이 마지막 1cm까지 닿음",
    copy: "휴대폰을 바닥에 내려놓지도 몸을 콘센트 쪽으로 구기지도 않았습니다. 케이블이 가진 모든 길이를 오늘 다 썼습니다.",
    aside: "여유는 없고\n연결은 됨.",
    asset: "cable",
    characterArt: "exactCable",
    category: "일상",
  },
  {
    id: 103,
    title: "지나가던 가방끈이 문고리에 안 걸리고 통과할 수도 있습니다.",
    cardTitle: "가방끈이 문고리를 피해 감",
    copy: "등 뒤에서 갑자기 세상에 붙잡히는 장면 없이 무사 통과했습니다. 문고리가 오늘은 남의 일에 참견하지 않았습니다.",
    aside: "뒤로 끌려갈\n뻔만 함.",
    asset: "delivery",
    characterArt: "strapEscape",
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

const serviceTimeZone = "Asia/Seoul";
const datePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: serviceTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function serviceDateParts(date: Date) {
  const parts = Object.fromEntries(datePartsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function localDateKey(date = new Date()) {
  const { year, month, day } = serviceDateParts(date);
  return `${year}-${month}-${day}`;
}

export function localTimeLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: serviceTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function monthKey(date = new Date()) {
  return localDateKey(date).slice(0, 7);
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return `${year}년 ${month}월`;
}

export function dateLabel(date = new Date()) {
  const { month, day } = serviceDateParts(date);
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: serviceTimeZone, weekday: "short" }).format(date);
  return `${Number(month)}월 ${Number(day)}일 (${weekday})`;
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
  const [year, month] = key.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = (value: number) => Math.max(1, Math.min(lastDay, value));
  return [
    { id: "sample-94", date: monthDate(key, safeDay(13)), time: "23:19", fortuneId: 94, title: "휴대폰이 이불 위로 안전 착지함", outcome: "happened", category: "일상", note: "놓쳤는데 바닥 말고 이불 위로 폭 떨어짐", sample: true },
    { id: "sample-95", date: monthDate(key, safeDay(14)), time: "08:12", fortuneId: 95, title: "신발 속 돌이 첫 흔들기에 나옴", outcome: "close", category: "일상", note: "한 번 털었더니 돌멩이가 바로 굴러나옴", sample: true },
    { id: "sample-96", date: monthDate(key, safeDay(15)), time: "14:41", fortuneId: 96, title: "의자 바퀴가 충전선을 안 밟음", outcome: "happened", category: "일상", note: "바퀴가 선 바로 옆에서 아슬아슬하게 멈춤", sample: true },
    { id: "sample-97", date: monthDate(key, safeDay(16)), time: "10:28", fortuneId: 97, title: "수정테이프가 한 줄로 완주함", outcome: "happened", category: "일상", note: "처음부터 끝까지 끊김 없이 하얗게 그어짐", sample: true },
    { id: "sample-98", date: monthDate(key, safeDay(17)), time: "17:56", fortuneId: 98, title: "반창고가 혼자 안 접힘", outcome: "close", category: "일상", note: "끈끈한 면끼리 안 붙고 상처에 바로 붙임", sample: true },
    { id: "sample-99", date: monthDate(key, safeDay(18)), time: "09:07", fortuneId: 99, title: "머리끈이 손목에서 발견됨", outcome: "happened", category: "일상", note: "찾으려다 손목에 이미 있는 걸 발견함", sample: true },
    { id: "sample-100", date: monthDate(key, safeDay(19)), time: "20:34", fortuneId: 100, title: "피자 치즈가 한입에서 깔끔히 끊김", outcome: "happened", category: "음식", note: "치즈가 길게 안 늘어나고 한입에서 딱 끊김", sample: true },
    { id: "sample-101", date: monthDate(key, safeDay(20)), time: "16:22", fortuneId: 101, title: "뽁뽁이가 첫 손가락에 뽁 함", outcome: "close", category: "기타", note: "첫 번째로 누른 칸이 바로 시원하게 터짐", sample: true },
    { id: "sample-102", date: monthDate(key, safeDay(21)), time: "22:48", fortuneId: 102, title: "충전선이 마지막 1cm까지 닿음", outcome: "happened", category: "일상", note: "딱 팽팽한 길이로 침대 위 휴대폰까지 연결됨", sample: true },
    { id: "sample-103", date: monthDate(key, safeDay(22)), time: "18:11", fortuneId: 103, title: "가방끈이 문고리를 피해 감", outcome: "happened", category: "일상", note: "문고리 바로 옆을 지나갔는데 안 걸림", sample: true },
    { id: "sample-84", date: monthDate(key, safeDay(3)), time: "16:08", fortuneId: 84, title: "우유에 빠진 쿠키를 구조함", outcome: "happened", category: "음식", note: "쿠키가 안 부서지고 그대로 다시 올라옴", sample: true },
    { id: "sample-85", date: monthDate(key, safeDay(4)), time: "12:36", fortuneId: 85, title: "숟가락이 국에 잠수하지 않음", outcome: "close", category: "음식", note: "그릇 위에서 끝까지 균형을 지킴", sample: true },
    { id: "sample-86", date: monthDate(key, safeDay(5)), time: "07:21", fortuneId: 86, title: "침대 시트 네 모서리가 밤새 버팀", outcome: "happened", category: "일상", note: "아침에도 시트 모서리가 전부 붙어 있었음", sample: true },
    { id: "sample-87", date: monthDate(key, safeDay(6)), time: "22:17", fortuneId: 87, title: "팝콘 껍질이 이에 안 낌", outcome: "happened", category: "음식", note: "한 통 다 먹었는데 혀가 할 일이 없었음", sample: true },
    { id: "sample-88", date: monthDate(key, safeDay(7)), time: "08:02", fortuneId: 88, title: "식빵 두 장이 같은 만큼 구워짐", outcome: "close", category: "음식", note: "두 장 색이 거의 복사한 것처럼 똑같았음", sample: true },
    { id: "sample-89", date: monthDate(key, safeDay(8)), time: "07:44", fortuneId: 89, title: "샴푸가 한 번만큼만 나옴", outcome: "happened", category: "일상", note: "펌프가 욕심 안 내고 딱 한 번만 나옴", sample: true },
    { id: "sample-90", date: monthDate(key, safeDay(9)), time: "19:13", fortuneId: 90, title: "라면 스프가 조용히 개봉됨", outcome: "happened", category: "음식", note: "가루 한 톨 안 날리고 봉지만 열림", sample: true },
    { id: "sample-91", date: monthDate(key, safeDay(10)), time: "23:04", fortuneId: 91, title: "치약이 진짜 콩알만큼 나옴", outcome: "close", category: "일상", note: "칫솔 가운데에 아주 작게 착륙함", sample: true },
    { id: "sample-92", date: monthDate(key, safeDay(11)), time: "09:38", fortuneId: 92, title: "슬리퍼가 먼저 외출 준비함", outcome: "happened", category: "일상", note: "두 짝 모두 문 쪽을 보고 기다리고 있었음", sample: true },
    { id: "sample-93", date: monthDate(key, safeDay(12)), time: "18:51", fortuneId: 93, title: "냉동만두가 각자 살고 있음", outcome: "happened", category: "음식", note: "봉지 흔들자 만두가 한 개씩 바로 떨어짐", sample: true },
    { id: "sample-74", date: monthDate(key, safeDay(24)), time: "12:18", fortuneId: 74, title: "나무젓가락이 정확히 반으로 갈라짐", outcome: "happened", category: "음식", note: "양쪽이 똑같이 반듯해서 사진까지 찍음", sample: true },
    { id: "sample-75", date: monthDate(key, safeDay(25)), time: "20:11", fortuneId: 75, title: "귤껍질이 한 줄로 이어짐", outcome: "close", category: "음식", note: "마지막까지 안 끊기고 긴 리본처럼 나옴", sample: true },
    { id: "sample-76", date: monthDate(key, safeDay(26)), time: "07:46", fortuneId: 76, title: "요거트 뚜껑이 깨끗함", outcome: "happened", category: "음식", note: "뚜껑 안쪽에 요거트가 하나도 없었음", sample: true },
    { id: "sample-77", date: monthDate(key, safeDay(27)), time: "18:03", fortuneId: 77, title: "소스가 음식에만 정확히 묻음", outcome: "close", category: "음식", note: "손에 안 묻히고 너겟 가운데만 짜냄", sample: true },
    { id: "sample-78", date: monthDate(key, safeDay(28)), time: "16:34", fortuneId: 78, title: "얼음이 딱 한 알만 나옴", outcome: "happened", category: "음식", note: "필요한 한 알만 손바닥으로 톡 나옴", sample: true },
    { id: "sample-79", date: monthDate(key, safeDay(29)), time: "14:22", fortuneId: 79, title: "지우개 가루를 한 덩이로 합침", outcome: "happened", category: "일상", note: "손가락으로 한 번 굴려서 동그랗게 만듦", sample: true },
    { id: "sample-80", date: monthDate(key, safeDay(30)), time: "19:47", fortuneId: 80, title: "비닐봉지가 바로 입을 열어줌", outcome: "close", category: "일상", note: "손가락 한 번 비비자 바로 열렸음", sample: true },
    { id: "sample-81", date: monthDate(key, safeDay(31)), time: "22:15", fortuneId: 81, title: "포토카드가 슬리브에 첫입장 성공", outcome: "happened", category: "기타", note: "모서리 하나 안 걸리고 쏙 들어감", sample: true },
    { id: "sample-82", date: monthDate(key, safeDay(1)), time: "08:09", fortuneId: 82, title: "양쪽 이어폰이 나란히 완충됨", outcome: "happened", category: "일상", note: "양쪽 모두 가득 충전돼서 기다리고 있었음", sample: true },
    { id: "sample-83", date: monthDate(key, safeDay(2)), time: "10:53", fortuneId: 83, title: "스테이플러가 첫 번에 제 일 함", outcome: "close", category: "일상", note: "심도 있었고 종이도 한 번에 전부 묶임", sample: true },
    { id: "sample-68", date: monthDate(key, safeDay(18)), time: "15:08", fortuneId: 68, title: "과자 봉지가 일자로 열림", outcome: "happened", category: "음식", note: "봉지 윗부분이 끝까지 반듯하게 뜯어짐", sample: true },
    { id: "sample-69", date: monthDate(key, safeDay(19)), time: "09:14", fortuneId: 69, title: "손 씻고도 소매가 뽀송함", outcome: "close", category: "일상", note: "양쪽 소매에 물 한 방울도 안 묻음", sample: true },
    { id: "sample-70", date: monthDate(key, safeDay(20)), time: "21:07", fortuneId: 70, title: "운동화 끈이 하루 종일 버팀", outcome: "happened", category: "일상", note: "집에 올 때까지 한 번도 안 풀림", sample: true },
    { id: "sample-71", date: monthDate(key, safeDay(21)), time: "08:33", fortuneId: 71, title: "가방 지퍼가 천을 안 물음", outcome: "close", category: "일상", note: "안감에 안 걸리고 끝까지 한 번에 닫힘", sample: true },
    { id: "sample-72", date: monthDate(key, safeDay(22)), time: "18:42", fortuneId: 72, title: "우산이 우산집에 한 번에 들어감", outcome: "happened", category: "일상", note: "다시 접지 않고 첫 시도에 쏙 들어감", sample: true },
    { id: "sample-73", date: monthDate(key, safeDay(23)), time: "13:26", fortuneId: 73, title: "샤프심이 첫 클릭에 나옴", outcome: "happened", category: "일상", note: "딸깍 한 번에 새 심이 바로 나옴", sample: true },
    { id: "sample-62", date: monthDate(key, safeDay(12)), time: "07:32", fortuneId: 62, title: "삶은 달걀이 매끈하게 벗겨짐", outcome: "happened", category: "음식", note: "껍질이 크게 두 조각으로 떨어짐", sample: true },
    { id: "sample-63", date: monthDate(key, safeDay(13)), time: "08:17", fortuneId: 63, title: "후드 끈 길이가 완벽 대칭", outcome: "close", category: "일상", note: "입자마자 양쪽 길이가 똑같았음", sample: true },
    { id: "sample-64", date: monthDate(key, safeDay(14)), time: "13:05", fortuneId: 64, title: "빨대가 첫 시도에 중앙 적중", outcome: "happened", category: "음식", note: "빨대 하나도 안 구겨지고 바로 들어감", sample: true },
    { id: "sample-65", date: monthDate(key, safeDay(15)), time: "16:28", fortuneId: 65, title: "휴지가 정확히 한 장만 나옴", outcome: "close", category: "일상", note: "두 장 안 붙고 한 장만 쏙 나옴", sample: true },
    { id: "sample-66", date: monthDate(key, safeDay(16)), time: "11:49", fortuneId: 66, title: "내 차례 직전에 수업 끝남", outcome: "happened", category: "사람", note: "바로 다음 순서였는데 종 울림", sample: true },
    { id: "sample-67", date: monthDate(key, safeDay(17)), time: "17:54", fortuneId: 67, title: "아이스바를 깨끗하게 완주함", outcome: "happened", category: "음식", note: "손에 안 흐르고 막대만 남았음", sample: true },
    { id: "sample-56", date: monthDate(key, safeDay(6)), time: "15:24", fortuneId: 56, title: "탄산 거품이 선을 지킴", outcome: "happened", category: "음식", note: "거품이 입구까지 왔다가 진짜 멈춤", sample: true },
    { id: "sample-57", date: monthDate(key, safeDay(7)), time: "22:03", fortuneId: 57, title: "컵라면 뚜껑이 혼자 버팀", outcome: "close", category: "음식", note: "아무것도 안 올렸는데 3분 버팀", sample: true },
    { id: "sample-58", date: monthDate(key, safeDay(8)), time: "19:41", fortuneId: 58, title: "배터리 1%가 집까지 버팀", outcome: "happened", category: "일상", note: "현관 들어올 때까지 안 꺼졌음", sample: true },
    { id: "sample-59", date: monthDate(key, safeDay(9)), time: "16:12", fortuneId: 59, title: "네 컷 모두 두 눈 생존", outcome: "happened", category: "사람", note: "네 장 다 눈 뜨고 찍힌 건 처음", sample: true },
    { id: "sample-60", date: monthDate(key, safeDay(10)), time: "08:51", fortuneId: 60, title: "랜덤 재생이 마음을 읽음", outcome: "close", category: "기타", note: "누르자마자 듣고 싶던 곡 나옴", sample: true },
    { id: "sample-61", date: monthDate(key, safeDay(11)), time: "20:36", fortuneId: 61, title: "떡볶이에서 쌍떡 발견", outcome: "happened", category: "음식", note: "포크 한 번에 떡 두 개 따라옴", sample: true },
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
