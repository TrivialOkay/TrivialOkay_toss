import { categories, fortuneFor, fortunes, hiddenCards, type Category, type HiddenCardId, type RecordItem } from "./byeolil-data";
import { wakppuVariants, type WakppuVariant } from "./wakppu-data";

export const recordsStorageKey = "byeolil-records-v2";
export const hiddenCardsStorageKey = "byeolil-hidden-cards-v1";
export const observedWakppuStorageKey = "byeolil-observed-wakppu-v1";

const legacyRecordsStorageKey = "byeolil-records-v1";
const migrationStorageKey = "byeolil-records-v1-migrated";
const obsoleteStorageKeys = [
  "byeolil-observed-fortunes-v1",
  "byeolil-sample-catalog-version",
] as const;

type StoredRecord = Partial<RecordItem> & { sample?: boolean };

export type SaveRecordsResult = {
  records: RecordItem[];
  saved: boolean;
  photosSaved: boolean;
};

const validFortuneIds = new Set(fortunes.map((fortune) => fortune.id));
const validHiddenCardIds = new Set<HiddenCardId>(hiddenCards.map((card) => card.id));
const validWakppuVariants = new Set<WakppuVariant>(wakppuVariants);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

function readStoredRecords(storage: Storage, key: string) {
  try {
    const stored = storage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as StoredRecord[];
    if (!Array.isArray(parsed)) return null;

    return parsed
      .filter((item): item is StoredRecord & Pick<RecordItem, "id" | "date" | "time" | "fortuneId" | "title" | "outcome"> =>
        item.sample !== true
        && typeof item.id === "string"
        && typeof item.date === "string"
        && datePattern.test(item.date)
        && typeof item.time === "string"
        && timePattern.test(item.time)
        && typeof item.fortuneId === "number"
        && validFortuneIds.has(item.fortuneId)
        && typeof item.title === "string"
        && (item.outcome === "happened" || item.outcome === "close" || item.outcome === "missed"),
      )
      .map((item) => ({
        id: item.id,
        date: item.date,
        time: item.time,
        fortuneId: item.fortuneId,
        title: item.title,
        outcome: item.outcome,
        category: categories.includes(item.category as Category)
          ? item.category as Category
          : fortuneFor(item.fortuneId).category,
        note: typeof item.note === "string" ? item.note : "",
        photoDataUrl: typeof item.photoDataUrl === "string" && item.photoDataUrl.startsWith("data:image/")
          ? item.photoDataUrl
          : undefined,
      }));
  } catch {
    return null;
  }
}

function uniqueRecords(records: RecordItem[]) {
  return records.filter((record, index) => records.findIndex((item) => item.id === record.id) === index);
}

export function loadRecords(storage: Storage = window.localStorage) {
  const current = readStoredRecords(storage, recordsStorageKey) ?? [];
  let migrationPending = false;
  try {
    migrationPending = storage.getItem(migrationStorageKey) !== "done";
  } catch {
    return current;
  }
  const legacy = migrationPending ? readStoredRecords(storage, legacyRecordsStorageKey) ?? [] : [];
  // 같은 ID가 양쪽에 있으면 더 최신 스키마인 v2 기록을 우선한다.
  const records = uniqueRecords([...current, ...legacy]);

  try {
    storage.setItem(recordsStorageKey, JSON.stringify(records));
    if (migrationPending) storage.setItem(migrationStorageKey, "done");
    for (const key of obsoleteStorageKeys) storage.removeItem(key);
  } catch {
    // 읽어온 기록은 현재 세션에서 계속 사용할 수 있게 둔다.
  }

  return records;
}

export function saveRecords(
  records: RecordItem[],
  photoFallbackRecords?: RecordItem[],
  storage: Storage = window.localStorage,
): SaveRecordsResult {
  try {
    storage.setItem(recordsStorageKey, JSON.stringify(records));
    return { records, saved: true, photosSaved: true };
  } catch {
    if (photoFallbackRecords) {
      try {
        storage.setItem(recordsStorageKey, JSON.stringify(photoFallbackRecords));
        return { records: photoFallbackRecords, saved: true, photosSaved: false };
      } catch {
        // 아래 공통 실패 결과로 처리한다.
      }
    }
    return { records, saved: false, photosSaved: false };
  }
}

export function loadHiddenCards(storage: Storage = window.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(hiddenCardsStorageKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is HiddenCardId => typeof id === "string" && validHiddenCardIds.has(id as HiddenCardId)))];
  } catch {
    return [];
  }
}

export function saveHiddenCards(ids: HiddenCardId[], storage: Storage = window.localStorage) {
  try {
    storage.setItem(hiddenCardsStorageKey, JSON.stringify([...new Set(ids)].filter((id) => validHiddenCardIds.has(id))));
    return true;
  } catch {
    return false;
  }
}

export function loadObservedWakppu(storage: Storage = window.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(observedWakppuStorageKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is WakppuVariant => typeof id === "string" && validWakppuVariants.has(id as WakppuVariant)))];
  } catch {
    return [];
  }
}

export function saveObservedWakppu(ids: WakppuVariant[], storage: Storage = window.localStorage) {
  try {
    storage.setItem(observedWakppuStorageKey, JSON.stringify([...new Set(ids)].filter((id) => validWakppuVariants.has(id))));
    return true;
  } catch {
    return false;
  }
}

export function clearRecords(storage: Storage = window.localStorage) {
  try {
    storage.setItem(recordsStorageKey, "[]");
    storage.setItem(legacyRecordsStorageKey, "[]");
    storage.setItem(hiddenCardsStorageKey, "[]");
    storage.setItem(observedWakppuStorageKey, "[]");
    storage.setItem(migrationStorageKey, "done");
    for (const key of obsoleteStorageKeys) storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
