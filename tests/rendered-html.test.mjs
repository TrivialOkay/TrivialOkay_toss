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

test("server-renders the Byeoril Today screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>별일 — 하찮은 운세 기록소<\/title>/i);
  assert.match(html, /오늘의 하찮은 운세/);
  assert.match(html, /실제로 일어났나요/);
  assert.match(html, /사진 찍고 기록하기/);
  assert.match(html, /별일 도감/);
  assert.doesNotMatch(html, /codex-preview|Building your site|Your site is taking shape/i);
});

test("renders accessible primary navigation", async () => {
  const html = await (await render()).text();
  assert.match(html, /<nav[^>]*aria-label="주요 메뉴"/i);
  for (const label of ["오늘", "도감", "기록", "내 정보"]) assert.match(html, new RegExp(`>${label}<`));
  assert.match(html, /aria-label="오늘의 운세 결과"/i);
});

test("keeps the legacy record migration in the client bundle", async () => {
  const chunkRoot = new URL("../dist/client/_next/static/chunks/", import.meta.url);
  const chunks = await readdir(chunkRoot);
  const source = (await Promise.all(chunks.filter((name) => name.endsWith(".js")).map((name) => readFile(new URL(name, chunkRoot), "utf8")))).join("\n");
  assert.match(source, /byeoril-records-v1/);
  assert.match(source, /byeoril-records-v2/);
});
