export type WakppuVariant = "chewyCookie" | "butterBar" | "sun" | "earth" | "mars" | "jupiter" | "moon" | "saturn" | "blackHole";

export type WakppuCatalogItem = {
  id: WakppuVariant;
  code: string;
  label: string;
  name: string;
  rarity: "흔함" | "희귀" | "특이";
  copy: string;
};

export const wakppuVariants: WakppuVariant[] = ["chewyCookie", "butterBar", "sun", "earth", "mars", "jupiter", "moon", "saturn", "blackHole"];

export const wakppuVariantLabels: Record<WakppuVariant, string> = {
  chewyCookie: "두쫀쿠",
  butterBar: "버터바",
  sun: "태양",
  earth: "지구",
  mars: "화성",
  jupiter: "목성",
  moon: "달",
  saturn: "토성",
  blackHole: "블랙홀",
};

export const wakppuCatalog: WakppuCatalogItem[] = [
  { id: "chewyCookie", code: "WAK-01", label: "두쫀쿠형", name: "두쫀쿠 소행성", rarity: "흔함", copy: "말랑한 지각 아래 쫀득한 우주 압력을 품고 있음." },
  { id: "butterBar", code: "WAK-02", label: "버터바형", name: "버터바 유성", rarity: "흔함", copy: "사각 궤도를 고집하며 부서질 때 고소한 파편을 남김." },
  { id: "sun", code: "WAK-03", label: "항성형", name: "미니 태양", rarity: "희귀", copy: "손바닥만 하지만 본인은 항성이라고 강하게 주장함." },
  { id: "earth", code: "WAK-04", label: "생명행성형", name: "주머니 지구", rarity: "희귀", copy: "바다와 구름 비슷한 무늬가 있으나 생명체는 젤리 하나뿐." },
  { id: "mars", code: "WAK-05", label: "적색행성형", name: "쪼꼬미 화성", rarity: "흔함", copy: "건조하고 붉음. 관측국 책상 위에서도 계속 굴러다님." },
  { id: "jupiter", code: "WAK-06", label: "가스행성형", name: "미니 목성", rarity: "희귀", copy: "덩치는 작아졌지만 줄무늬와 자존심은 그대로임." },
  { id: "moon", code: "WAK-07", label: "위성형", name: "주머니 달", rarity: "흔함", copy: "분화구가 많고 눌러보면 생각보다 참을성이 좋음." },
  { id: "saturn", code: "WAK-08", label: "고리행성형", name: "미니 토성", rarity: "희귀", copy: "고리는 장식이 아니라 본체의 패션 철학이라고 함." },
  { id: "blackHole", code: "WAK-09", label: "중력특이점형", name: "아기 블랙홀", rarity: "특이", copy: "빛과 기대를 조금씩 삼킴. 깨려면 평소보다 끈기가 필요함." },
];

export const blackHoleUnlockCount = 5;

export function wakppuVariantFor(fortuneId: number, blackHoleUnlocked = true) {
  const candidate = wakppuVariants[Math.abs(fortuneId) % wakppuVariants.length];
  if (candidate !== "blackHole" || blackHoleUnlocked) return candidate;
  const visibleVariants = wakppuVariants.filter((variant) => variant !== "blackHole");
  return visibleVariants[Math.abs(fortuneId) % visibleVariants.length];
}
