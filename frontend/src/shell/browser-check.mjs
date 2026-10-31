import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Browser QA uses an isolated local profile. Test fixtures never change published data.
const baseUrl = new URL(process.env.PANDAAI_QA_URL || 'http://127.0.0.1:5173/');
const storageKey = 'pandaai:c-shell:v1';
const artifactDir = process.env.PANDAAI_QA_ARTIFACTS || path.join(os.tmpdir(), 'pandaai-shell-browser-evidence');
const runFixtures = process.env.PANDAAI_QA_FIXTURES !== '0';
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pandaai-shell-browser-'));
const downloadDir = path.join(temporaryRoot, 'downloads');
const browserProfile = path.join(temporaryRoot, 'profile');
await fs.mkdir(downloadDir);
await fs.mkdir(artifactDir, { recursive: true });
const readJson = async relative => JSON.parse(await fs.readFile(new URL(relative, import.meta.url), 'utf8'));
const samplePlay = await readJson('../../../data/samples/levels/L01.play.json');
const sampleReveal = await readJson('../../../data/samples/levels/L01.reveal.json');
const sampleProfile = await readJson('../../../data/samples/sample_profile.json');
const requests = [];
const exceptions = [];
const fixtureFailures = [];
const screenshots = [];
const checks = [];
let browser;
let page;
let child;
let stderr = '';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function poll(read, description, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const value = await read(); if (value) return value; }
    catch (cause) { last = cause; }
    await delay(80);
  }
  throw new Error(`Timed out: ${description}${last ? ` (${last.message})` : ''}`);
}

class CDP {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', message => {
      const data = JSON.parse(message.data);
      if (data.id) {
        const entry = this.pending.get(data.id);
        if (entry) {
          this.pending.delete(data.id);
          clearTimeout(entry.timeout);
          data.error ? entry.reject(new Error(JSON.stringify(data.error))) : entry.resolve(data.result);
        }
      }
      for (const listener of this.listeners.get(data.method) || []) {
        Promise.resolve(listener(data.params)).catch(cause => fixtureFailures.push(cause.message));
      }
    });
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new CDP(socket);
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      this.pending.set(id, { resolve, reject, timeout });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }
  close() { this.socket.close(); }
}

async function evaluate(expression) {
  const result = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.result.description || result.exceptionDetails.text);
  return result.result.value;
}
const waitFor = (expression, description = expression) => poll(() => evaluate(`Boolean(${expression})`), description);
const saved = () => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}))`);
async function navigatePage(method, params) {
  let loaded = false;
  page.on('Page.loadEventFired', () => { loaded = true; });
  await page.send(method, params);
  await poll(() => loaded, 'page load completed');
}
async function click(label) {
  const value = JSON.stringify(label);
  await waitFor(`[...document.querySelectorAll('button')].some(button => (button.getAttribute('aria-label') || button.textContent).trim() === ${value} && !button.disabled)`, `enabled button ${label}`);
  await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(button=>(button.getAttribute('aria-label') || button.textContent).trim()===${value});button.scrollIntoView({block:'center',behavior:'instant'});button.click();return true})()`);
}
async function checkWidth(label) {
  const metrics = await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})');
  assert.ok(metrics.scrollWidth <= metrics.width, `${label}: horizontal overflow ${JSON.stringify(metrics)}`);
}
async function viewport(width, height = 812) {
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
}
async function screenshot(filename, full = true) {
  await delay(260);
  await evaluate("scrollTo({top:0,behavior:'instant'})");
  const result = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
  const target = path.join(artifactDir, filename);
  await fs.writeFile(target, Buffer.from(result.data, 'base64'));
  screenshots.push(target);
}
async function cleanReload() {
  await evaluate(`(()=>{for(const key of Object.keys(localStorage))if(key.startsWith(${JSON.stringify(storageKey)}))localStorage.removeItem(key);return true})()`);
  await navigatePage('Page.reload', { ignoreCache: true });
  await waitFor("document.querySelector('.home-hero') && [...document.querySelectorAll('button')].some(b=>b.textContent==='进入交易观察室'&&!b.disabled)", 'home ready');
}
async function begin() {
  await click('进入交易观察室');
  await waitFor("document.body.innerText.includes('30 秒了解玩法')", 'instructions');
  await checkWidth('instructions at 375px');
  await click('开始这一局');
  await waitFor("document.querySelector('.play-level')", 'play ready');
}
function validateEvents(game) {
  const requiredData = {
    session_start: ['device'], level_start: ['budget', 'is_supplementary'],
    clue_open: ['clue_id', 'kind', 'signal', 'cost', 'budget_left'],
    decision: ['side', 'size', 'confidence', 'stop', 'clues_opened', 'think_ms'],
    hold_step: ['step', 'pnl_before', 'action', 'position_after'], stop_triggered: ['step', 'pnl'],
    level_end: ['pnl', 'final_position'], reveal_view: ['dwell_ms'], profile_view: ['round'], session_end: [],
  };
  game.events.forEach((event, index) => {
    assert.deepEqual(Object.keys(event).sort(), ['seq', 'session_id', 'level_id', 't_ms', 'at', 'type', 'data'].sort());
    assert.equal(event.seq, index + 1, 'event sequence stays continuous');
    assert.equal(event.session_id, game.sessionId);
    assert.ok(event.level_id === null || typeof event.level_id === 'string');
    assert.ok(Number.isFinite(event.t_ms) && event.t_ms >= 0);
    assert.ok(Number.isFinite(Date.parse(event.at)));
    assert.ok(Object.hasOwn(requiredData, event.type), `known event ${event.type}`);
    for (const key of requiredData[event.type]) assert.ok(Object.hasOwn(event.data, key), `${event.type}.${key}`);
  });
  assert.equal(game.events.filter(event => event.type === 'session_start').length, 1);
}
async function downloadProfile(expected) {
  const before = new Set(await fs.readdir(downloadDir));
  await click('导出画像 JSON');
  const filename = await poll(async () => (await fs.readdir(downloadDir)).find(name => name.endsWith('.json') && !before.has(name)), 'Profile JSON download');
  const downloaded = JSON.parse(await fs.readFile(path.join(downloadDir, filename), 'utf8'));
  assert.deepEqual(downloaded, expected);
  assert.equal(Object.hasOwn(downloaded, 'events'), false, 'export contains no raw event log');
  return filename;
}
async function downloadSubmission(profile) {
  const before = new Set(await fs.readdir(downloadDir));
  await click('导出提交版 JSON');
  const filename = await poll(async () => (await fs.readdir(downloadDir)).find(name => name.startsWith('submission-') && !before.has(name)), 'submission JSON download');
  const downloaded = JSON.parse(await fs.readFile(path.join(downloadDir, filename), 'utf8'));
  assert.equal(downloaded.schema, 'submission/v1');
  assert.equal(downloaded.session_id, profile.session_id);
  assert.equal(downloaded.dimensions.length, profile.dimensions.length, 'submission keeps every dimension');
  assert.equal(downloaded.recommendations.filter(item => item.type === 'skill-card').length, 4, 'submission carries all four skill cards');
  assert.equal(downloaded.recommendations.filter(item => item.type === 'referral').length, (profile.recommendations ?? []).length, 'submission carries the profile referral cards');
  for (const dimension of downloaded.dimensions) {
    assert.ok(dimension.judgement && dimension.confidence, 'submission dimension carries judgement and confidence');
    assert.ok(dimension.evidence.every(item => typeof item === 'string' && item.includes(' · ')), 'submission evidence is readable text');
  }
  for (const recommendation of downloaded.recommendations) {
    assert.ok(recommendation.reason && recommendation.next_step, 'submission recommendation carries reason and next step');
    if (recommendation.type === 'skill-card') assert.equal(recommendation.is_sample, true, 'in-game exercise is labelled as sample');
    else assert.ok(recommendation.url?.startsWith('https://'), 'referral carries a real link');
  }
  assert.equal(Object.hasOwn(downloaded, 'events'), false, 'submission contains no raw event log');
  return filename;
}
const revealRequests = start => requests.slice(start).filter(url => new URL(url).pathname.endsWith('.reveal.json'));

async function finishPlay() {
  await click('提交决定，揭晓走势');
  for (let step = 1; step <= 3; step++) {
    await waitFor(`document.querySelector('.play-actions h3')?.textContent === '持有第 ${step}/3 步'`, `holding step ${step}`);
    await click('持有');
  }
  await waitFor("document.querySelector('.reveal-page')", 'reveal');
}

const skillRecommendations = [];
async function checkSkillCards(mode) {
  assert.equal(await evaluate("document.querySelectorAll('.skill-card').length"), 4);
  assert.equal(await evaluate("document.querySelectorAll('.skill-card[data-recommended=true]').length"), 2);
  assert.equal(await evaluate("[...document.querySelectorAll('.skill-card')].filter(c=>!c.hidden).length"), 2, 'two recommendations visible initially');
  skillRecommendations.push(await evaluate("[...document.querySelectorAll('.skill-card[data-recommended=true]')].map(e=>e.dataset.skill).join(',')"));
  const before = await saved();
  const start = requests.length;
  for (const name of ['趋势追踪卡', '止损护盾卡', '反转确认卡', '交易复盘卡']) {
    if (await evaluate(`[...document.querySelectorAll('.skill-card')].some(c=>c.hidden&&c.querySelector('h3')?.textContent===${JSON.stringify(name)})`)) await click('展开另外 2 张技能卡');
    await click(`体验${name}`);
    await waitFor(`document.querySelector('#skill-lab-title')?.textContent === ${JSON.stringify(`${name}实验室`)}`, `${name} lab`);
    assert.equal(await evaluate("document.querySelectorAll('select[aria-label=练习关卡] option').length"), before.completed.length);
    if (name === '趋势追踪卡') await evaluate("(()=>{const s=document.querySelector('select[aria-label=快均线]');s.value='10';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
    if (name === '止损护盾卡') await evaluate("(()=>{const s=document.querySelector('select[aria-label=练习方向]');s.value='-1';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
    if (name === '反转确认卡') await evaluate("(()=>{const s=document.querySelector('select[aria-label=确认窗口]');s.value='5';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
    if (name === '交易复盘卡') {
      assert.equal(await evaluate("document.querySelectorAll('.skill-review article').length"), 3);
      await evaluate("(()=>{const s=document.querySelector('select[aria-label=下一次改动]');s.value='缩小仓位，先设保护线';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
    } else {
      assert.equal(await evaluate("document.querySelectorAll('.skill-metrics strong').length"), 3);
      assert.equal(await evaluate("document.querySelectorAll('.skill-equity polyline').length"), 2);
      assert.equal(await evaluate("document.querySelector('.skill-metrics').innerText.includes('NaN')"), false);
    }
    await checkWidth(`${mode} ${name} at 375px`);
    if (mode === 'research') for (const width of [320, 390, 768]) { await viewport(width); await checkWidth(`${name} at ${width}px`); }
    await viewport(375);
    await click('完成这次练习');
    await waitFor("document.querySelector('.skill-completion')", 'practice completion');
    if (name === '止损护盾卡' && mode === 'research') {
      await screenshot('pandaai-skill-shield-mobile.png');
      await evaluate("document.querySelector('#skill-lab').scrollIntoView({block:'start',behavior:'instant'})");
      const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const target = path.join(artifactDir, 'pandaai-skill-lab-viewport.png');
      await fs.writeFile(target, Buffer.from(shot.data, 'base64')); screenshots.push(target);
    }
    await click('关闭练习');
    assert.equal(await evaluate("document.querySelector('#skill-lab') === null"), true);
    await waitFor(`document.activeElement?.textContent === ${JSON.stringify(`体验${name}`)}`, 'close restores keyboard focus');
  }
  const downloadsBefore = new Set(await fs.readdir(downloadDir));
  await click('导出推荐与练习 JSON');
  const filename = await poll(async () => (await fs.readdir(downloadDir)).find(n => n.startsWith('skill-practice-') && n.endsWith('.json') && !downloadsBefore.has(n)), 'practice download');
  const data = JSON.parse(await fs.readFile(path.join(downloadDir, filename), 'utf8'));
  assert.equal(data.schema, 'skill-practice/v1');
  assert.equal(data.session_id, before.sessionId);
  assert.equal(data.exercises.length, 4);
  assert.equal(data.exercises.find(e=>e.skill_id==='trend').parameters.fast, 10);
  assert.equal(data.exercises.find(e=>e.skill_id==='shield').parameters.side, -1);
  assert.equal(data.exercises.find(e=>e.skill_id==='reversal').parameters.window, 5);
  assert.equal(data.exercises.find(e=>e.skill_id==='review').lesson, '缩小仓位，先设保护线');
  assert.equal(Object.hasOwn(data, 'events'), false);
  const after = await saved();
  assert.deepEqual(after.events, before.events, 'practice never adds game/profile evidence');
  assert.deepEqual(after.profile, before.profile, 'practice never rewrites profile');
  assert.equal(requests.slice(start).some(u => /\/levels\//.test(u)), false, 'practice uses completed data without new level requests');
  checks.push(`${mode}: four functional skill cards, parameter changes, task JSON, original profile/events unchanged`);
}

async function actualSample() {
  const index = await (await fetch(new URL('levels/index.json', baseUrl))).json();
  assert.equal(index.is_sample, false);
  assert.equal(index.main.length + index.pool.length, 10);
  const personas = new Set();
  for (const mode of ['research', 'heavy', 'flat']) {
    const start = requests.length;
    await navigatePage('Page.navigate', { url: baseUrl.href });
    await waitFor("document.querySelector('.app-shell')", 'app ready');
    await cleanReload();
    await checkWidth('home at 375px');
    if (mode === 'research') await screenshot('pandaai-shell-home-mobile.png');
    if (mode === 'research') { await viewport(1280, 900); await checkWidth('desktop home'); await screenshot('pandaai-home-desktop.png', false); await viewport(375); }
    assert.equal(revealRequests(start).length, 0);
    await begin();
    for (const [cursor, id] of index.main.entries()) {
      await waitFor(`document.querySelector('.play-level h2')?.textContent.includes(${JSON.stringify(id)})`, `${id} play`);
      assert.equal(revealRequests(start).length, cursor, 'no early reveal');
      const reveal = await (await fetch(new URL(`levels/${id}.reveal.json`, baseUrl))).json();
      assert.equal(await evaluate(`document.body.innerText.includes(${JSON.stringify(reveal.symbol)})`), false);
      if (mode === 'research') {
        await evaluate("(()=>{for(const b of document.querySelectorAll('.play-clues button'))if(!b.disabled)b.click();return true})()");
        await click('做多'); await click('轻仓 20%'); await click('3'); await click('5%');
      }
      if (mode === 'heavy') { await click('做多'); await click('重仓 100%'); await click('5'); await click('不设止损'); }
      if (mode === 'flat') { await click('观望'); await click('3'); await click('不设止损'); }
      assert.equal(await evaluate("document.querySelector('.play-submit').disabled"), false, 'submit enabled once all four choices are made');
      await checkWidth(`${mode} play at 375px`);
      await finishPlay();
      assert.equal(revealRequests(start).length, cursor + 1);
      assert.equal(await evaluate("document.querySelector('#reveal-market-title').textContent"), reveal.name);
      assert.equal(await evaluate("document.querySelectorAll('.comparison-row').length"), 4);
      await checkWidth('reveal at 375px');
      if (cursor === 0) {
        if (mode === 'research') await screenshot('pandaai-shell-reveal-mobile.png');
        const before = await saved();
        await navigatePage('Page.reload', { ignoreCache: true });
        await waitFor("document.querySelector('.reveal-page')", 'restored reveal');
        assert.deepEqual((await saved()).events.slice(0, before.events.length), before.events);
        assert.equal(revealRequests(start).length, 1, 'restore does not refetch reveal');
      }
      await click('继续探索');
    }
    await waitFor("document.querySelector('.profile-page')", 'computed profile');
    const first = await saved();
    validateEvents(first);
    assert.equal(first.completed.length, 4);
    assert.equal(first.profile.round, 1);
    assert.equal(first.profile.is_sample, false);
    assert.equal(first.events.filter(e=>e.type==='hold_step').length,12);
    assert.equal(await evaluate("document.querySelectorAll('.dimension-card').length"), 6);
    assert.equal(await evaluate("document.body.innerText.includes('固定示例画像')"), false);
    personas.add(first.profile.persona.name);
    if (mode === 'research') { await screenshot('pandaai-profile-overview-mobile.png', false); await viewport(1280, 900); await screenshot('pandaai-profile-overview-desktop.png', false); await viewport(375); }
    await checkSkillCards(mode);
    if (mode === 'flat') for (const id of ['calibration','risk_control']) assert.equal(first.profile.dimensions.find(d=>d.id===id).score,null);
    await evaluate("document.querySelectorAll('details').forEach(e=>e.open=true)");
    assert.ok(await evaluate("document.querySelectorAll('.event-detail').length > 0"));
    assert.equal(await evaluate("document.body.innerText.includes('本机未找到')"),false);
    await checkWidth('expanded profile at 375px');
    if (mode === 'research') await screenshot('pandaai-shell-profile-mobile.png');
    await downloadProfile(first.profile);
    await downloadSubmission(first.profile);
    await navigatePage('Page.reload', { ignoreCache: true });
    await waitFor("document.querySelector('.profile-page')", 'restored profile');
    assert.equal((await saved()).events.filter(e=>e.type==='profile_view').length,1);
    if (await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='再来一关，补充观察')")) {
      await click('再来一关，补充观察');
      await waitFor("document.querySelector('.play-level')", 'supplement');
      const supplement=(await saved()).play.id;
      assert.ok(index.pool.some(p=>p.id===supplement));
      assert.equal(revealRequests(start).length,4);
      await finishPlay();
      await click('继续探索');
      await waitFor("document.querySelector('.changes-panel')", 'round two');
      const second=await saved();
      validateEvents(second);
      assert.equal(second.completed.length,5);
      assert.equal(second.profile.round,2);
      assert.equal(second.events.find(e=>e.type==='level_start'&&e.level_id===supplement).data.is_supplementary,true);
      assert.deepEqual(second.events.filter(e=>e.type==='profile_view').map(e=>e.data.round),[1,2]);
      assert.ok(second.profile.dimensions.some(d=>d.evidence.some(e=>e.level_id===supplement)));
      assert.equal(revealRequests(start).length,5);
      await downloadProfile(second.profile);
      await downloadSubmission(second.profile);
    } else assert.notEqual(mode,'flat','unscored abilities should offer supplementation');
    await viewport(1280,900);
    await checkWidth('profile desktop');
    await viewport(375);
    await click('完成本次探索');
    await waitFor("document.body.innerText.includes('本局已结束')", 'finished');
    assert.equal((await saved()).events.filter(e=>e.type==='session_end').length,1);
    checks.push(`real ${mode}: four main levels, computed profile, available supplement, evidence, JSON, refresh, mobile/desktop`);
  }
  assert.ok(personas.size>=2,'contrasting players produce different personas');
  assert.ok(new Set(skillRecommendations).size>=2,'contrasting players get different recommendations');
  await click('重新开始');
  await waitFor("document.querySelector('.home-hero')", 'new session home');
  await begin();
  const interrupted = await saved();
  await navigatePage('Page.reload', { ignoreCache: true });
  await waitFor("document.body.innerText.includes('你的行为记录还在')", 'mid-play recovery notice');
  assert.deepEqual((await saved()).events, interrupted.events, 'mid-play refresh preserves events');
  await click('保留记录，重新开始');
  await waitFor("document.querySelector('.home-hero')", 'recovery restart');
  const archived = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(`${storageKey}:previous`)}))`);
  assert.equal(archived.sessionId, interrupted.sessionId);
  assert.deepEqual(archived.events.slice(0, interrupted.events.length), interrupted.events);
  assert.equal((await saved()).events.length, 0);
  assert.notEqual((await saved()).sessionId, interrupted.sessionId);
  checks.push('real-data three-path end-to-end integration', 'deferred reveal, complete event envelopes, refresh persistence, current-session evidence, 375px and desktop layout, mid-play preservation');
}

async function fullProtocolFixture() {
  const fixtureIndex = { schema: 'level-index/v1', is_sample: true, main: ['T01', 'T02', 'T03', 'T04'], pool: [{ id: 'T05', probes: ['evidence_use'] }] };
  let servedMain = fixtureIndex.main;
  const fixtureModule = `
    const sample = ${JSON.stringify(sampleProfile)};
    globalThis.__C_QA_INPUTS = [];
    export async function analyze(input) {
      const expectedMainCount = globalThis.__C_QA_EXPECT_MAIN_COUNT ?? 4;
      if (input.levels.length !== (input.round === 1 ? expectedMainCount : expectedMainCount + 1)) throw new Error('Test fixture: wrong completed-level count');
      if (input.round === 2 && input.previous?.round !== 1) throw new Error('Test fixture: previous profile missing');
      globalThis.__C_QA_INPUTS.push(structuredClone(input));
      const profile = structuredClone(sample);
      profile.session_id = input.session_id;
      profile.generated_at = new Date().toISOString();
      profile.round = input.round;
      profile.is_sample = true;
      profile.persona.name = '测试夹具熊猫';
      profile.summary = '测试夹具，仅验证 C 的模块串联，不用于线上玩家判断。';
      const evidence = input.events.find(event => event.type === 'decision' && event.level_id === 'T01');
      profile.dimensions.forEach((dimension, index) => {
        dimension.judgement = '测试夹具判断 ' + index;
        dimension.confidence = ['high', 'medium', 'low'][index % 3];
        if (index === 5) dimension.score = null;
        dimension.evidence = [{ level_id: 'T01', event_seqs: [evidence.seq], text: '测试夹具：引用本局 T01 的提交决定。', direction: '+' }];
      });
      profile.needs_more = input.round === 1 ? [{ dimension_id: 'evidence_use', reason: '测试夹具：需要补充观察' }] : [];
      if (input.round === 2) profile.changes = [{ dimension_id: 'evidence_use', before: '测试夹具：补充前', after: '测试夹具：补充后' }];
      return profile;
    }
    export function pickNextLevel(profile, index, playedIds) {
      return profile.round === 1 && profile.needs_more.length ? index.pool.find(item => !playedIds.includes(item.id))?.id ?? null : null;
    }
  `;
  page.on('Fetch.requestPaused', async event => {
    const url = new URL(event.request.url);
    let value;
    let contentType = 'application/json';
    if (url.pathname.endsWith('/src/profile/index.ts')) {
      value = fixtureModule;
      contentType = 'application/javascript';
    } else if (url.pathname.endsWith('/levels/index.json')) value = JSON.stringify({ ...fixtureIndex, main: servedMain });
    else {
      const match = url.pathname.match(/\/levels\/(T0[1-5])\.(play|reveal)\.json$/);
      if (match) value = JSON.stringify({ ...(match[2] === 'play' ? samplePlay : sampleReveal), id: match[1], is_sample: true,
        ...(match[2] === 'play' ? { masked_name: `测试关卡 ${match[1]}` } : {}) });
    }
    if (value === undefined) { await page.send('Fetch.continueRequest', { requestId: event.requestId }); return; }
    await page.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: contentType }, { name: 'Cache-Control', value: 'no-store' }],
      body: Buffer.from(value).toString('base64') });
  });
  const origin = baseUrl.origin;
  await page.send('Fetch.enable', { patterns: [{ urlPattern: `${origin}*/levels/*`, requestStage: 'Request' }, { urlPattern: `${origin}*/src/profile/index.ts*`, requestStage: 'Request' }] });
  const start = requests.length;
  await cleanReload();
  await begin();
  for (let index = 0; index < fixtureIndex.main.length; index++) {
    const id = fixtureIndex.main[index];
    await waitFor(`document.querySelector('.play-level h2')?.textContent === ${JSON.stringify(`测试关卡 ${id}`)}`, `${id} play`);
    assert.equal(revealRequests(start).length, index, `${id}: no early reveal`);
    await click('观望');
    await finishPlay();
    await waitFor(`document.querySelector('.reveal-page') && JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)})).play.id === ${JSON.stringify(id)}`, `${id} reveal`);
    assert.equal(revealRequests(start).length, index + 1);
    await checkWidth(`${id} reveal at 375px`);
    await click('继续探索');
  }
  await waitFor("document.querySelector('#persona-name')?.textContent === '测试夹具熊猫'", 'round-one fixture profile');
  const roundOne = await saved();
  assert.equal(roundOne.profile.round, 1);
  assert.equal(roundOne.completed.length, 4);
  assert.equal(roundOne.profile.is_sample, true);
  assert.equal(await evaluate("document.body.innerText.includes('固定示例画像')"), false, 'computed sample profile is not mislabeled as the fixed fixture');
  assert.equal(await evaluate("document.querySelectorAll('.confidence-high').length"), 2);
  assert.equal(await evaluate("document.querySelectorAll('.confidence-medium').length"), 2);
  assert.equal(await evaluate("document.querySelectorAll('.confidence-low').length"), 2);
  assert.equal(await evaluate("document.body.innerText.includes('证据不足，暂不评分')"), true, 'null scores stay unscored');
  await evaluate("document.querySelectorAll('details').forEach(element=>element.open=true)");
  assert.equal(await evaluate("document.querySelectorAll('.event-detail').length"), 6, 'computed sample evidence links matching current-session events');
  assert.equal(await evaluate("document.querySelector('.event-detail pre').textContent.includes('flat')"), true);
  await checkWidth('expanded real-evidence fixture at 375px');
  await click('再来一关，补充观察');
  await waitFor("document.querySelector('.play-level h2')?.textContent === '测试关卡 T05'", 'supplementary play');
  assert.equal((await saved()).events.find(event => event.type === 'level_start' && event.level_id === 'T05').data.is_supplementary, true);
  assert.equal(revealRequests(start).length, 4, 'supplementary reveal not prefetched');
  await click('观望');
    await finishPlay();
  await waitFor("document.querySelector('.reveal-page')", 'supplementary reveal');
  await click('继续探索');
  await waitFor("document.querySelector('.changes-panel')", 'updated profile and changes');
  const roundTwo = await saved();
  const inputs = await evaluate('globalThis.__C_QA_INPUTS');
  assert.equal(roundTwo.profile.round, 2);
  assert.equal(roundTwo.completed.length, 5);
  assert.equal(inputs.length, 2);
  assert.equal(inputs[0].levels.length, 4);
  assert.equal(inputs[1].levels.length, 5);
  assert.deepEqual(inputs[1].previous, roundOne.profile);
  assert.deepEqual(roundTwo.events.filter(event => event.type === 'profile_view').map(event => event.data.round), [1, 2]);
  assert.equal(await evaluate("document.querySelector('.changes-panel').textContent.includes('测试夹具：补充前') && document.querySelector('.changes-panel').textContent.includes('测试夹具：补充后')"), true);
  assert.equal(revealRequests(start).length, 5);
  validateEvents(roundTwo);
  await checkWidth('round-two profile at 375px');
  await downloadProfile(roundTwo.profile);
  await downloadSubmission(roundTwo.profile);
  await click('完成本次探索');
  const finishedFourLevels = await saved();
  assert.equal(finishedFourLevels.events.filter(event => event.type === 'session_end').length, 1);

  // A can replace its index between sessions. A restart must discard the old loader cache.
  servedMain = ['T01', 'T02'];
  await evaluate('globalThis.__C_QA_EXPECT_MAIN_COUNT = 2');
  const indexRequestsBefore = requests.filter(url => new URL(url).pathname.endsWith('/levels/index.json')).length;
  await click('重新开始');
  await waitFor(`document.querySelector('.home-hero') && JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}))?.index?.main?.length === 2`, 'new session reloads changed index');
  const changedIndexSession = await saved();
  assert.notEqual(changedIndexSession.sessionId, finishedFourLevels.sessionId);
  assert.deepEqual(changedIndexSession.index.main, ['T01', 'T02']);
  assert.equal(changedIndexSession.events.length, 0);
  assert.equal(requests.filter(url => new URL(url).pathname.endsWith('/levels/index.json')).length, indexRequestsBefore + 1, 'restart requests the current server index');
  const twoLevelStart = requests.length;
  await begin();
  assert.equal(await evaluate("document.querySelector('.status-line').textContent.includes('第 1 / 2 关')"), true);
  for (const id of servedMain) {
    await waitFor(`document.querySelector('.play-level h2')?.textContent === ${JSON.stringify(`测试关卡 ${id}`)}`, `updated index ${id} play`);
    await click('观望');
    await finishPlay();
    await waitFor(`document.querySelector('.reveal-page') && JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)})).play.id === ${JSON.stringify(id)}`, `updated index ${id} reveal`);
    await click('继续探索');
  }
  await waitFor("document.querySelector('.profile-page')", 'updated two-level session profile');
  const twoLevelProfile = await saved();
  assert.equal(twoLevelProfile.completed.length, 2, 'new session really ends its main sequence after two levels');
  assert.deepEqual(twoLevelProfile.completed.map(item => item.play.id), ['T01', 'T02']);
  assert.equal((await evaluate('globalThis.__C_QA_INPUTS')).at(-1).levels.length, 2);
  assert.equal(revealRequests(twoLevelStart).length, 2, 'new loader fetches only the two current reveals');
  validateEvents(twoLevelProfile);
  await click('完成本次探索');
  const beforeArchiveFailure = await saved();

  // A full local archive must not trap the player inside an already-ended session.
  await evaluate(`(()=>{globalThis.__C_QA_ORIGINAL_SET_ITEM=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===${JSON.stringify(`${storageKey}:previous`)})throw new DOMException('Test archive quota','QuotaExceededError');return globalThis.__C_QA_ORIGINAL_SET_ITEM.call(this,key,value)};return true})()`);
  try {
    await click('重新开始');
    await waitFor("document.querySelector('.home-hero') && document.body.innerText.includes('上一局仅保留在本页内存')", 'archive failure warning and new-session home');
    const afterArchiveFailure = await saved();
    assert.notEqual(afterArchiveFailure.sessionId, beforeArchiveFailure.sessionId, 'archive failure still creates a fresh session');
    assert.equal(afterArchiveFailure.events.length, 0, 'old ended events never carry into the new session');
    assert.equal(afterArchiveFailure.screen, 'home');
  } finally {
    await evaluate('Storage.prototype.setItem=globalThis.__C_QA_ORIGINAL_SET_ITEM;delete globalThis.__C_QA_ORIGINAL_SET_ITEM;true');
  }
  await begin();
  const afterFailureStart = await saved();
  assert.notEqual(afterFailureStart.sessionId, beforeArchiveFailure.sessionId);
  assert.equal(afterFailureStart.events.some(event => event.session_id === beforeArchiveFailure.sessionId), false);
  assert.deepEqual(afterFailureStart.events.map(event => event.type), ['session_start', 'level_start']);
  validateEvents(afterFailureStart);
  assert.deepEqual(fixtureFailures, []);
  checks.push('CDP-only fixtures: four main levels → round 1 → supplementary level → round 2 changes → JSON', 'computed sample profiles preserve current-session evidence links', 'analysis gets completed levels and prior profile; supplementary event flag; five reveals requested only after their decisions', 'restart fetches a changed server index and completes the new two-level sequence; archive-quota failure still creates an independent fresh session with a memory-only warning');
}

try {
  const candidates = [process.env.BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  let executable;
  for (const candidate of candidates) { try { await fs.access(candidate); executable = candidate; break; } catch {} }
  assert.ok(executable, 'Chrome/Edge executable available; set BROWSER_EXECUTABLE when needed');
  child = spawn(executable, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${browserProfile}`, '--no-first-run', '--no-default-browser-check', '--disable-default-apps', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-2000); });
  const portFile = path.join(browserProfile, 'DevToolsActivePort');
  const [port, browserPath] = (await poll(async () => fs.readFile(portFile, 'utf8'), 'isolated Chrome startup')).trim().split(/\r?\n/);
  browser = await CDP.connect(`ws://127.0.0.1:${port}${browserPath}`);
  await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir, eventsEnabled: true });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(item => item.type === 'page');
  assert.ok(target, 'isolated page target exists');
  page = await CDP.connect(target.webSocketDebuggerUrl);
  page.on('Network.requestWillBeSent', event => requests.push(event.request.url));
  page.on('Runtime.exceptionThrown', event => exceptions.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  await viewport(375);
  assert.equal((await fetch(baseUrl)).status, 200, 'preview responds HTTP 200');
  await actualSample();
  if (runFixtures) await fullProtocolFixture();
  assert.deepEqual(exceptions, [], 'no uncaught browser runtime exceptions');
  assert.deepEqual(fixtureFailures, [], 'no request-interception errors');
  console.log(JSON.stringify({ ok: true, url: baseUrl.href, checks, screenshots, limitation: 'Desktop browser mobile emulation; domestic mobile-network verification still requires a real device.' }, null, 2));
} catch (cause) {
  try { if (page) await screenshot('pandaai-shell-failure.png'); } catch {}
  console.error(JSON.stringify({ ok: false, message: cause.message, stack: cause.stack, exceptions, fixtureFailures, screenshots, browserStderr: stderr }, null, 2));
  process.exitCode = 1;
} finally {
  if (browser) { try { await browser.send('Browser.close'); } catch {} }
  page?.close();
  browser?.close();
  if (child && child.exitCode === null) {
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]);
    if (child.exitCode === null) child.kill();
  }
  // Delete only the verified, unique temporary directory created by this process.
  const resolvedTemporary = path.resolve(temporaryRoot);
  const resolvedTempRoot = path.resolve(os.tmpdir());
  if (resolvedTemporary.startsWith(`${resolvedTempRoot}${path.sep}`) && path.basename(resolvedTemporary).startsWith('pandaai-shell-browser-')) {
    await fs.rm(resolvedTemporary, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 });
  }
}
