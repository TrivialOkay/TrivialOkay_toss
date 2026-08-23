import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Byeolil Today screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>별일 관측국 — 하찮은 일을 쓸데없이 진지하게<\/title>/i);
  assert.match(html, /오늘의 별일 예보/);
  const serviceDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(new Date());
  assert.match(html, new RegExp(serviceDate.replace(" ", "\\s*")));
  assert.match(html, /관측 결과 분류함/);
  assert.match(html, /카드를 실제 결과와 맞는 투입구에 넣어주세요/);
  assert.match(html, /다른 왁뿌볼 불러오기/);
  assert.match(html, /운세 다시 뽑기/);
  assert.match(html, /분류 결정/);
  assert.match(html, />사용법</);
  assert.match(html, /현장 증거 더하기/);
  assert.match(html, /예보를 꺼내면 관측할 수 있어요/);
  assert.match(html, />보관소</);
  assert.doesNotMatch(html, /codex-preview|Building your site|Your site is taking shape/i);
});

test("renders accessible primary navigation", async () => {
  const html = await (await render()).text();
  assert.match(html, /<nav[^>]*aria-label="주요 메뉴"/i);
  for (const label of ["예보", "보관소", "관측일지", "내 정보"]) assert.match(html, new RegExp(`>${label}<`));
  assert.match(html, /aria-label="오늘의 운세 결과"/i);
});

test("keeps the legacy record migration in the client bundle", async () => {
  const chunkRoot = new URL("../dist/client/_next/static/chunks/", import.meta.url);
  const chunks = await readdir(chunkRoot);
  const source = (await Promise.all(chunks.filter((name) => name.endsWith(".js")).map((name) => readFile(new URL(name, chunkRoot), "utf8")))).join("\n");
  assert.match(source, /byeolil-records-v1/);
  assert.match(source, /byeolil-records-v2/);
  assert.match(source, /byeolil-hidden-cards-v1/);
  assert.match(source, /히든 상호작용 카드/);
  assert.match(source, /히든 카드만 비밀 보관함에 등록/);
  assert.match(source, /슥— 한방컷/);
  assert.match(source, /별빛 과충전/);
  assert.match(source, /양자 얽힘/);
  assert.match(source, /아브라다-깨다브라/);
  assert.match(source, /미러 디멘션 개방/);
  assert.match(source, /중력 역전/);
  assert.match(source, /분류 결정 · 도감과 관측일지에 등록했어요/);
  assert.match(source, /이 버튼을 눌러야 운세가 도감에 저장돼요/);
  assert.match(source, /새 운세 뽑기/);
  assert.match(source, /카드를 분류하면 기록할 수 있어요/);
  assert.match(source, /현장 증거 확보 · 별가루 \+1/);
  assert.match(source, /관측 증거 부착실/);
  assert.match(source, /부착 대상 카드/);
  assert.match(source, /이 카드에 현장 증거 붙이기/);
  assert.match(source, /byeolil-observed-wakppu-v1/);
  assert.match(source, /왁뿌볼 천체도감/);
  assert.match(source, /별일 보관소/);
  assert.match(source, /4개 도감 운영 중/);
  assert.match(source, /미확인 천체 보관록/);
  assert.match(source, /천체 5종을 관측하면 신호가 열려요/);
  assert.match(source, /중력 특이점 출현 조건 해제/);
  assert.match(source, /WAK-\?\?/);
  assert.doesNotMatch(source, /sample-94/);
});
