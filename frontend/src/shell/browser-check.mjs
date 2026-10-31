import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Browser QA uses an isolated local profile. Test fixtures never change published data.
const baseUrl = new URL(process.env.PANDAAI_QA_URL || 'http://127.0.0.1:5173/');
const storageKey = 'pandaai:c-shell:v1';
const artifactDir = process.env.PANDAAI_QA_ARTIFACTS || path.join(os.tmpdir(), 'pandaai-shell-browser-evidence');
const runFixtures = process.env.PANDAAI_QA_FIXTURES !== '0';
const captureMotionFrames = process.env.PANDAAI_QA_CAPTURE_MOTION === '1';
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
const artworkNetwork = new Map();
const motionEvidence = [];
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

function observeArtworkNetwork(client) {
  client.on('Network.requestWillBeSent', event => {
    const url = new URL(event.request.url);
    if (event.type !== 'Image' || !url.pathname.includes('/persona-')) return;
    artworkNetwork.set(event.requestId, { url: url.origin + url.pathname, startedAt: event.timestamp, dataEvents: [] });
  });
  client.on('Network.responseReceived', event => {
    const record = artworkNetwork.get(event.requestId);
    if (record) Object.assign(record, { responseAt: event.timestamp, status: event.response.status, protocol: event.response.protocol, mimeType: event.response.mimeType, fromDiskCache: event.response.fromDiskCache });
  });
  client.on('Network.dataReceived', event => {
    const record = artworkNetwork.get(event.requestId);
    if (record) record.dataEvents.push({ at: event.timestamp, encodedBytes: event.encodedDataLength, decodedBytes: event.dataLength });
  });
  client.on('Network.loadingFinished', event => {
    const record = artworkNetwork.get(event.requestId);
    if (record) Object.assign(record, { finishedAt: event.timestamp, encodedBytes: event.encodedDataLength });
  });
  client.on('Network.loadingFailed', event => {
    const record = artworkNetwork.get(event.requestId);
    if (record) Object.assign(record, { failedAt: event.timestamp, errorText: event.errorText, canceled: event.canceled, blockedReason: event.blockedReason });
  });
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
  await waitFor(`[...document.querySelectorAll('button')].some(button => button.textContent.trim() === ${value} && !button.disabled)`, `enabled button ${label}`);
  await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===${value});button.scrollIntoView({block:'center'});button.click();return true})()`);
}
async function checkWidth(label) {
  const metrics = await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})');
  assert.ok(metrics.scrollWidth <= metrics.width, `${label}: horizontal overflow ${JSON.stringify(metrics)}`);
}
async function viewport(width, height = 812) {
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
}
async function screenshot(filename) {
  await delay(260);
  await evaluate('scrollTo(0,0)');
  const result = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const target = path.join(artifactDir, filename);
  await fs.writeFile(target, Buffer.from(result.data, 'base64'));
  screenshots.push(target);
}
async function screenshotElement(selector, filename) {
  await delay(100);
  const clip = await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});const rect=element.getBoundingClientRect();return {x:Math.max(0,rect.left+scrollX-4),y:Math.max(0,rect.top+scrollY-4),width:Math.min(rect.width+8,document.documentElement.scrollWidth),height:rect.height+8,scale:1}})()`);
  const result = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
  const target = path.join(artifactDir, filename);
  await fs.writeFile(target, Buffer.from(result.data, 'base64'));
  screenshots.push(target);
}
async function screenshotViewport(filename) {
  // A top-layer dialog is fixed to the viewport, so document clips can displace it.
  const result = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const target = path.join(artifactDir, filename);
  await fs.writeFile(target, Buffer.from(result.data, 'base64'));
  screenshots.push(target);
}
async function mouseClick(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'center'})`);
  await delay(80);
  const point = await evaluate(`(()=>{const rect=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2}})()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
async function keyPress(key) {
  const code = key === ' ' ? 'Space' : key;
  const virtualKey = key === ' ' ? 32 : key === 'Enter' ? 13 : 27;
  // keyDown + text includes the native keypress activation used by Enter on buttons.
  const text = key === 'Enter' ? '\r' : key === ' ' ? ' ' : '';
  await page.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, ...(text ? { text, unmodifiedText: text } : {}), windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey });
}
async function settleCard() {
  await evaluate("Promise.all(document.querySelector('.persona-trading-card').getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{})))");
}

const mainArtSurface = '.persona-card-front .persona-art-surface';
const previewArtSurface = '.persona-gallery-dialog[open] .persona-preview-content .persona-art-surface';

async function motionSnapshot(selector) {
  return evaluate(`(()=>{
    const surface=document.querySelector(${JSON.stringify(selector)});
    if(!surface)throw new Error('Motion surface not found');
    const canvas=surface.querySelector('canvas.persona-motion-canvas');
    const gl=canvas?.getContext('webgl');
    if(!gl||gl.isContextLost())throw new Error('Motion canvas has no usable WebGL context');
    const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
    const pixels=new Uint8Array(width*height*4);
    gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let hash=2166136261,centerHash=2166136261,edgeHash=2166136261,coloredPixels=0,alpha=0;
    const edgeBand=Math.max(1,Math.floor(Math.min(width,height)*.015));
    for(let index=0;index<pixels.length;index+=4){
      const pixel=index/4,x=pixel%width,y=Math.floor(pixel/width);
      const center=x>width*.2&&x<width*.8&&y>height*.2&&y<height*.8;
      const edge=x<edgeBand||x>=width-edgeBand||y<edgeBand||y>=height-edgeBand;
      if(pixels[index]||pixels[index+1]||pixels[index+2])coloredPixels++;
      alpha+=pixels[index+3];
      for(let channel=0;channel<4;channel++){
        hash=Math.imul(hash^pixels[index+channel],16777619);
        if(center)centerHash=Math.imul(centerHash^pixels[index+channel],16777619);
        if(edge)edgeHash=Math.imul(edgeHash^pixels[index+channel],16777619);
      }
    }
    return {state:surface.dataset.motionState,frame:Number(surface.dataset.motionFrame),width,height,hash:hash>>>0,centerHash:centerHash>>>0,edgeHash:edgeHash>>>0,coloredPixels,alpha,hidden:canvas.hidden};
  })()`);
}

async function expectMotionPlaying(selector, label) {
  await waitFor(`document.querySelector(${JSON.stringify(selector)})?.dataset.motionState === 'playing' && Number(document.querySelector(${JSON.stringify(selector)}).dataset.motionFrame) > 0`, `${label}: playing renderer`);
  const before = await motionSnapshot(selector);
  await delay(300);
  const after = await motionSnapshot(selector);
  assert.ok(before.coloredPixels > before.width * before.height / 10 && before.alpha > 0, `${label}: real illustration pixels are drawn`);
  assert.ok(after.frame > before.frame, `${label}: draw-frame counter advances`);
  assert.notEqual(after.hash, before.hash, `${label}: actual WebGL pixels change, not only attributes`);
  assert.notEqual(after.centerHash, before.centerHash, `${label}: character-region pixels move`);
  assert.equal(after.edgeHash, before.edgeHash, `${label}: outer illustration edges stay fixed`);
  motionEvidence.push({ label, expected: 'playing', before, after });
  return after;
}

async function expectMotionFrozen(selector, label, hidden = false) {
  await waitFor(`document.querySelector(${JSON.stringify(selector)})?.dataset.motionState === 'paused'`, `${label}: paused renderer`);
  await delay(100);
  const before = await motionSnapshot(selector);
  await delay(300);
  const after = await motionSnapshot(selector);
  assert.equal(after.frame, before.frame, `${label}: frame counter stops`);
  assert.equal(after.hash, before.hash, `${label}: canvas pixels remain frozen`);
  if (hidden) {
    assert.equal(after.hidden, true, `${label}: motion canvas is hidden`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(`${selector} canvas`)})).display`), 'none', `${label}: hidden canvas is not displayed`);
  }
  motionEvidence.push({ label, expected: 'paused', before, after });
  return after;
}

async function showMainArt() {
  await evaluate(`document.querySelector(${JSON.stringify(mainArtSurface)}).scrollIntoView({block:'center',inline:'center'})`);
  await settleCard();
}

async function previewPauseChecks() {
  await expectMotionFrozen(mainArtSurface, 'main card while modal is open');
  await expectMotionPlaying(previewArtSurface, 'active modal illustration');
  await mouseClick('.persona-gallery-dialog[open] .persona-preview-motion-toggle');
  await expectMotionFrozen(previewArtSurface, 'preview pause control');
  await expectMotionFrozen(mainArtSurface, 'main card remains paused with preview paused');
  await mouseClick('.persona-gallery-dialog[open] .persona-preview-motion-toggle');
  await expectMotionPlaying(previewArtSurface, 'preview play control');
  await expectMotionFrozen(mainArtSurface, 'main card stays paused with active preview');
}

async function modalPausesVisibleCard() {
  await showMainArt();
  await expectMotionPlaying(mainArtSurface, 'main card before modal');
  // Keep the main illustration in view to distinguish modal pausing from offscreen pausing.
  await evaluate("(()=>{const button=document.querySelector('.persona-gallery-item');button.focus({preventScroll:true});button.click();return true})()");
  await waitFor("document.querySelector('.persona-gallery-dialog[open]')", 'controlled modal with main card in view');
  assert.equal(await evaluate(`(()=>{const rect=document.querySelector(${JSON.stringify(mainArtSurface)}).getBoundingClientRect();return rect.bottom>0&&rect.top<innerHeight})()`), true);
  await waitFor("document.querySelector('.persona-gallery-dialog[open] .persona-art-surface > img')?.complete && document.querySelector('.persona-gallery-dialog[open] .persona-art-surface > img').naturalWidth>0", 'controlled modal artwork loaded');
  await previewPauseChecks();
  await keyPress('Escape');
  await waitFor("!document.querySelector('.persona-gallery-dialog[open]')", 'controlled modal closed');
  await showMainArt();
  await expectMotionPlaying(mainArtSurface, 'main card resumes after modal closes');
}

async function recordMotion(selector, artworkId) {
  if (!captureMotionFrames) return;
  const directory = path.join(artifactDir, 'motion-frames');
  await fs.mkdir(directory, { recursive: true });
  const started = performance.now();
  const frames = [];
  for (let index = 0; index < 36; index++) {
    await delay(Math.max(0, index * 1000 / 12 - (performance.now() - started)));
    const result = await evaluate(`(()=>{const surface=document.querySelector(${JSON.stringify(selector)});const canvas=surface.querySelector('canvas');return {image:canvas.toDataURL('image/png'),frame:Number(surface.dataset.motionFrame),state:surface.dataset.motionState}})()`);
    assert.equal(result.state, 'playing', 'recording captures a playing artwork');
    const bytes = Buffer.from(result.image.split(',')[1], 'base64');
    const filename = `persona-${artworkId}-${String(index + 1).padStart(3, '0')}.png`;
    await fs.writeFile(path.join(directory, filename), bytes);
    frames.push({ filename, capturedAfterMs: Math.round(performance.now() - started), drawFrame: result.frame, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  assert.ok(new Set(frames.map(frame => frame.sha256)).size > 1, 'recorded PNGs contain changing pixels');
  const manifest = path.join(directory, 'frames.json');
  await fs.writeFile(manifest, JSON.stringify({ artworkId, targetFps: 12, targetDurationSeconds: 3, frames }, null, 2));
  console.log(JSON.stringify({ motionRecording: manifest, frames: frames.length, distinctPixelFrames: new Set(frames.map(frame => frame.sha256)).size }));
}

async function verifyContextLossFallback() {
  const injected = await evaluate(`(()=>{const surface=document.querySelector(${JSON.stringify(previewArtSurface)});const gl=surface.querySelector('canvas').getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)return false;extension.loseContext();return true})()`);
  assert.equal(injected, true, 'test browser exposes controlled WebGL context loss');
  await waitFor(`document.querySelector(${JSON.stringify(previewArtSurface)}).dataset.motionState==='fallback'`, 'context-loss static fallback');
  const before = await evaluate(`(()=>{const surface=document.querySelector(${JSON.stringify(previewArtSurface)});const canvas=surface.querySelector('canvas');const image=surface.querySelector('img');return {frame:Number(surface.dataset.motionFrame),hidden:canvas.hidden,display:getComputedStyle(canvas).display,imageLoaded:image.complete&&image.naturalWidth>0,imageVisible:getComputedStyle(image).visibility==='visible'&&Number(getComputedStyle(image).opacity)>0}})()`);
  assert.equal(before.hidden, true);
  assert.equal(before.display, 'none');
  assert.equal(before.imageLoaded && before.imageVisible, true, 'fallback retains the visible static illustration');
  await delay(300);
  assert.equal(await evaluate(`Number(document.querySelector(${JSON.stringify(previewArtSurface)}).dataset.motionFrame)`), before.frame, 'lost context does not continue drawing');
  motionEvidence.push({ label: 'controlled context loss', expected: 'fallback', ...before });
  await screenshotViewport('persona-motion-context-loss-fallback.png');
}

const personaArtworks = [
  ['bull', '冲锋蛮牛'], ['owl', '夜猫研究员'], ['shark', '深海猎鲨'], ['turtle', '稳健老龟'],
  ['crab', '逆行螃蟹'], ['dolphin', '冲浪海豚'], ['fox', '灵活狐狸'], ['sloth', '树懒观察员'],
  ['hedgehog', '死扛刺猬'],
];

async function personaCardChecks(profile, interactions = false) {
  await waitFor("document.querySelector('.persona-card-art')?.complete && document.querySelector('.persona-card-art').naturalWidth > 0", 'computed persona artwork loaded');
  const matched = personaArtworks.find(([, name]) => name === profile.persona.name);
  const expectedArtwork = matched ?? personaArtworks[profile.persona.name === '冲锋熊猫' ? 0 : 6];
  assert.equal(await evaluate("document.querySelector('#persona-name').textContent"), profile.persona.name);
  assert.equal(await evaluate(`document.querySelector('.persona-card-art').currentSrc.includes(${JSON.stringify(`persona-${expectedArtwork[0]}`)})`), true, 'artwork matches the computed persona');
  assert.equal(await evaluate("document.querySelector('.persona-trading-card').classList.contains('is-flipped')"), false, 'a profile opens on the front of its card');
  await checkWidth('persona card at 375px');
  if (!interactions) return;
  const before = await saved();
  await settleCard();
  await showMainArt();
  await expectMotionPlaying(mainArtSurface, 'main card initial animation');
  await mouseClick('.persona-card-controls .persona-motion-toggle');
  await showMainArt();
  await expectMotionFrozen(mainArtSurface, 'main pause control');
  await mouseClick('.persona-card-controls .persona-motion-toggle');
  await showMainArt();
  await expectMotionPlaying(mainArtSurface, 'main play control');
  await evaluate('scrollTo(0,document.documentElement.scrollHeight)');
  await waitFor(`document.querySelector(${JSON.stringify(mainArtSurface)}).getBoundingClientRect().bottom<=0`, 'main card moved outside the viewport');
  await expectMotionFrozen(mainArtSurface, 'offscreen main card');
  await showMainArt();
  await expectMotionPlaying(mainArtSurface, 'main card resumes after scrolling into view');
  await screenshotElement('.persona-card-column', 'persona-card-front-mobile.png');

  await mouseClick('.persona-art-turn');
  await waitFor("document.querySelector('.persona-trading-card.is-flipped')", 'mouse artwork flip');
  assert.equal(await evaluate("document.activeElement === document.querySelector('.persona-flip-button')"), true, 'artwork flip moves focus outside the aria-hidden front face');
  assert.equal(await evaluate("document.querySelector('.persona-flip-button').getAttribute('aria-pressed')"), 'true');
  assert.equal(await evaluate("document.querySelector('.persona-card-front').getAttribute('aria-hidden')"), 'true');
  assert.equal(await evaluate("document.querySelector('.persona-card-back').getAttribute('aria-hidden')"), 'false');
  assert.equal(await evaluate("document.querySelector('.persona-art-turn').tabIndex"), -1);
  assert.equal(await evaluate("document.querySelector('.persona-back-return').tabIndex"), 0);
  assert.equal(await evaluate("document.querySelector('.persona-card-back-content').tabIndex"), 0, 'visible scrolling back face can receive keyboard focus');
  await settleCard();
  await expectMotionFrozen(mainArtSurface, 'flipped card');
  await checkWidth('persona card back at 375px');
  await screenshotElement('.persona-card-column', 'persona-card-back-mobile.png');
  await evaluate("document.querySelector('.persona-flip-button').focus()");
  await keyPress('Enter');
  await waitFor("!document.querySelector('.persona-trading-card.is-flipped')", 'Enter flips to front');
  await settleCard();
  await showMainArt();
  await expectMotionPlaying(mainArtSurface, 'card after keyboard return to front');
  await keyPress(' ');
  await waitFor("document.querySelector('.persona-trading-card.is-flipped')", 'Space flips to back');
  await settleCard();
  await expectMotionFrozen(mainArtSurface, 'keyboard-flipped card');
  await mouseClick('.persona-back-return');
  await waitFor("!document.querySelector('.persona-trading-card.is-flipped')", 'back button returns to front');
  assert.equal(await evaluate("document.activeElement === document.querySelector('.persona-flip-button')"), true, 'back return moves focus outside the aria-hidden back face');
  assert.equal(await evaluate("document.querySelector('.persona-card-back-content').tabIndex"), -1, 'hidden back face is excluded from keyboard navigation');
  await settleCard();
  await showMainArt();
  await expectMotionPlaying(mainArtSurface, 'card after back-return control');

  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate("matchMedia('(prefers-reduced-motion:reduce)').matches"), true);
  const motion = await evaluate("({animation:getComputedStyle(document.querySelector('.persona-trading-card')).animationName,rotor:getComputedStyle(document.querySelector('.persona-card-rotor')).transitionDuration,art:getComputedStyle(document.querySelector('.persona-card-front .persona-art-surface')).transitionDuration})");
  assert.equal(motion.animation, 'none');
  assert.equal(motion.rotor, '0s');
  assert.equal(motion.art, '0s');
  assert.equal(await evaluate("document.querySelector('.persona-card-controls .persona-motion-toggle').disabled"), true, 'system reduced motion disables the play control');
  await expectMotionFrozen(mainArtSurface, 'system reduced motion', true);
  await evaluate("document.querySelector('.persona-flip-button').focus()");
  await keyPress(' ');
  await waitFor("document.querySelector('.persona-trading-card.is-flipped')", 'reduced-motion flip still works');
  await keyPress('Enter');
  await waitFor("!document.querySelector('.persona-trading-card.is-flipped')", 'reduced-motion return still works');
  await page.send('Emulation.setEmulatedMedia', { features: [] });
  await showMainArt();
  await expectMotionPlaying(mainArtSurface, 'card resumes after reduced-motion preference is removed');
  await modalPausesVisibleCard();

  assert.equal(await evaluate("document.querySelectorAll('.persona-gallery-item').length"), personaArtworks.length);
  for (const [index, [id, name]] of personaArtworks.entries()) {
    const selector = `.persona-gallery-item[aria-label="预览${name}插画"]`;
    await mouseClick(selector);
    await waitFor(`document.querySelector('.persona-gallery-dialog[open] .persona-preview-content h2')?.textContent === ${JSON.stringify(name)}`, `${name} gallery dialog`);
    await waitFor("document.querySelector('.persona-gallery-dialog[open] .persona-art-surface > img')?.complete && document.querySelector('.persona-gallery-dialog[open] .persona-art-surface > img').naturalWidth > 0", `${name} full artwork loaded`);
    assert.equal(await evaluate(`document.querySelector('.persona-gallery-dialog[open] .persona-art-surface > img').currentSrc.includes(${JSON.stringify(`persona-${id}`)})`), true);
    assert.deepEqual(await evaluate("(()=>{const image=document.querySelector('.persona-gallery-dialog[open] .persona-art-surface > img');return [image.naturalWidth,image.naturalHeight]})()"), [640, 640]);
    await expectMotionPlaying(previewArtSurface, `${name} preview animation`);
    await expectMotionFrozen(mainArtSurface, `${name} modal pauses the main card`);
    if (id === 'hedgehog') await recordMotion(previewArtSurface, id);
    assert.equal(await evaluate("document.querySelector('.persona-gallery-dialog[open]').contains(document.activeElement)"), true, 'modal receives keyboard focus');
    assert.equal(await evaluate("(()=>{const rect=document.querySelector('.persona-gallery-dialog[open]').getBoundingClientRect();return rect.left>=0&&rect.right<=innerWidth&&rect.top>=0&&rect.bottom<=innerHeight})()"), true, 'gallery preview fits the mobile viewport');
    await checkWidth(`${name} gallery at 375px`);
    if (index === 0) await screenshotViewport('persona-card-gallery-preview-mobile.png');
    if (id === 'hedgehog') await verifyContextLossFallback();
    if (index === 0) await keyPress('Escape');
    else await mouseClick('.persona-gallery-dialog[open] .persona-close-preview');
    await waitFor("!document.querySelector('.persona-gallery-dialog[open]')", `${name} gallery closed`);
    assert.equal(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(selector)})`), true, 'modal restores focus to its gallery button');
  }
  assert.equal(await evaluate("[...document.querySelectorAll('.persona-gallery-image img')].every(image=>image.complete&&image.naturalWidth>0)"), true, 'all nine thumbnails loaded');
  assert.equal(await evaluate("new Set([...document.querySelectorAll('.persona-gallery-image img')].map(image=>image.currentSrc)).size"), personaArtworks.length, 'all nine roles have distinct artwork resources');
  await evaluate("document.querySelector('.persona-gallery-strip').scrollLeft=0");
  await screenshotElement('.persona-gallery', 'persona-card-gallery-mobile.png');
  assert.deepEqual((await saved()).profile, before.profile, 'gallery and flip actions do not mutate the Profile');
  assert.deepEqual((await saved()).events, before.events, 'gallery and flip actions do not invent game events');
  assert.equal(await evaluate("document.querySelector('#persona-name').textContent"), profile.persona.name, 'gallery never changes the computed persona');

  const priorDownloads = new Set(await fs.readdir(downloadDir));
  await evaluate("(()=>{globalThis.__C_QA_DRAW_TEXT=[];globalThis.__C_QA_FILL_TEXT=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){globalThis.__C_QA_DRAW_TEXT.push(String(text));return globalThis.__C_QA_FILL_TEXT.call(this,text,...args)};return true})()");
  let drawn;
  let exportedFile;
  try {
    await click('保存人物卡图片');
    exportedFile = await poll(async () => (await fs.readdir(downloadDir)).find(name => name.endsWith('.png') && !priorDownloads.has(name)), 'persona PNG download');
    await waitFor("document.querySelector('.persona-save-status').textContent.includes('人物卡图片已生成')", 'persona PNG generated successfully');
    drawn = await evaluate('globalThis.__C_QA_DRAW_TEXT');
  } finally {
    await evaluate('CanvasRenderingContext2D.prototype.fillText=globalThis.__C_QA_FILL_TEXT;delete globalThis.__C_QA_FILL_TEXT;delete globalThis.__C_QA_DRAW_TEXT;true');
  }
  const exportedBytes = await fs.readFile(path.join(downloadDir, exportedFile));
  assert.deepEqual([...exportedBytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'valid PNG signature');
  assert.equal(exportedBytes.readUInt32BE(16), 900);
  assert.equal(exportedBytes.readUInt32BE(20), 1320);
  const artworkNumber = String(personaArtworks.indexOf(expectedArtwork) + 1).padStart(2, '0');
  assert.deepEqual(drawn.slice(0, 3), ['PANDAAI · 交易人格', matched ? `图鉴 ${artworkNumber}` : '趣味人物卡', profile.persona.name]);
  const footerIndex = drawn.indexOf('趣味标签 · 不代表真实交易能力');
  assert.ok(footerIndex >= 3);
  assert.equal(drawn.slice(3, footerIndex).join(''), profile.persona.tagline.replace(/\n/g, ''), 'PNG draws only the public persona tagline');
  assert.deepEqual(drawn.slice(footerIndex), matched ? ['趣味标签 · 不代表真实交易能力'] : ['趣味标签 · 不代表真实交易能力', '通用角色插画']);
  assert.equal(drawn.join('\n').includes(profile.session_id), false, 'no session identifier is drawn');
  for (const key of ['session_id', 'event_seqs', 'level_id', 't_ms', 'clues_opened', 'hold_step', 'stop_triggered', 'think_ms']) assert.equal(drawn.join('\n').includes(key), false, `PNG excludes raw behavior field ${key}`);
  for (const event of before.events) assert.equal(drawn.join('\n').includes(JSON.stringify(event)), false, 'no serialized raw event is drawn');
  const preservedExport = path.join(artifactDir, `persona-card-export-${expectedArtwork[0]}.png`);
  await fs.copyFile(path.join(downloadDir, exportedFile), preservedExport);
  screenshots.push(preservedExport);
  assert.deepEqual((await saved()).profile, before.profile, 'saving a card does not mutate its Profile');
  assert.deepEqual((await saved()).events, before.events, 'saving a card does not append raw behavior events');
  checks.push('nine persona artworks: real WebGL center pixels change while outer edges stay fixed; frames and pixels freeze on pause, flip, offscreen, modal, and reduced motion', 'persona cards: artwork matches computed persona; mouse/Enter/Space flip, aria states, all nine distinct gallery images, read-only previews, 375px layout', 'persona PNG: valid 900×1320 download; captured canvas text contains only public card labels/name/tagline and no session, evidence, or raw behavior');
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
const revealRequests = start => requests.slice(start).filter(url => new URL(url).pathname.endsWith('.reveal.json'));

async function finishPlay() {
  await click('提交决定，揭晓走势');
  for (let step = 1; step <= 3; step++) {
    await waitFor(`document.querySelector('.play-actions h3')?.textContent === '持有第 ${step}/3 步'`, `holding step ${step}`);
    await click('持有');
  }
  await waitFor("document.querySelector('.reveal-page')", 'reveal');
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
    assert.equal(revealRequests(start).length, 0);
    await begin();
    for (const [cursor, id] of index.main.entries()) {
      await waitFor(`document.querySelector('.play-level h2')?.textContent.includes(${JSON.stringify(id)})`, `${id} play`);
      assert.equal(revealRequests(start).length, cursor, 'no early reveal');
      const reveal = await (await fetch(new URL(`levels/${id}.reveal.json`, baseUrl))).json();
      assert.equal(await evaluate(`document.body.innerText.includes(${JSON.stringify(reveal.symbol)})`), false);
      if (mode === 'research') {
        await evaluate("(()=>{for(const b of document.querySelectorAll('.play-clues button'))if(!b.disabled)b.click();return true})()");
        await click('5%');
      }
      if (mode === 'heavy') { await click('重仓 100%'); await click('5'); }
      if (mode === 'flat') await click('观望');
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
    await personaCardChecks(first.profile, mode === 'research');
    if (mode === 'flat') for (const id of ['calibration','risk_control']) assert.equal(first.profile.dimensions.find(d=>d.id===id).score,null);
    await evaluate("document.querySelectorAll('details').forEach(e=>e.open=true)");
    assert.ok(await evaluate("document.querySelectorAll('.event-detail').length > 0"));
    assert.equal(await evaluate("document.body.innerText.includes('本机未找到')"),false);
    await checkWidth('expanded profile at 375px');
    if (mode === 'research') await screenshot('pandaai-shell-profile-mobile.png');
    await downloadProfile(first.profile);
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
      await personaCardChecks(second.profile);
      assert.equal(second.events.find(e=>e.type==='level_start'&&e.level_id===supplement).data.is_supplementary,true);
      assert.deepEqual(second.events.filter(e=>e.type==='profile_view').map(e=>e.data.round),[1,2]);
      assert.ok(second.profile.dimensions.some(d=>d.evidence.some(e=>e.level_id===supplement)));
      assert.equal(revealRequests(start).length,5);
      await downloadProfile(second.profile);
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
  assert.equal(await evaluate("document.querySelectorAll('.dimension-card .confidence-high').length"), 2);
  assert.equal(await evaluate("document.querySelectorAll('.dimension-card .confidence-medium').length"), 2);
  assert.equal(await evaluate("document.querySelectorAll('.dimension-card .confidence-low').length"), 2);
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
  observeArtworkNetwork(page);
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
  await fs.writeFile(path.join(artifactDir, 'persona-motion-verification.json'), JSON.stringify(motionEvidence, null, 2));
  console.log(JSON.stringify({ ok: true, url: baseUrl.href, checks, screenshots, limitation: 'Desktop browser mobile emulation; domestic mobile-network verification still requires a real device.' }, null, 2));
} catch (cause) {
  try { if (page) await screenshot('pandaai-shell-failure.png'); } catch {}
  try { if (page) await screenshotViewport('pandaai-shell-failure-viewport.png'); } catch {}
  const imageRequests = [...artworkNetwork.values()].map(record => ({ ...record,
    responseAfterMs: record.responseAt ? Math.round((record.responseAt - record.startedAt) * 1000) : null,
    finishedAfterMs: record.finishedAt ? Math.round((record.finishedAt - record.startedAt) * 1000) : null,
    receivedEncodedBytes: record.dataEvents.reduce((sum, event) => sum + event.encodedBytes, 0),
  }));
  const networkArtifact = path.join(artifactDir, 'persona-network-failure.json');
  await fs.writeFile(networkArtifact, JSON.stringify(imageRequests, null, 2));
  let motionStates = [];
  try { if (page) motionStates = await evaluate("[...document.querySelectorAll('.persona-art-surface')].map(surface=>({state:surface.dataset.motionState,frame:surface.dataset.motionFrame,canvasHidden:surface.querySelector('canvas')?.hidden,width:surface.querySelector('canvas')?.width,height:surface.querySelector('canvas')?.height}))"); } catch {}
  console.error(JSON.stringify({ ok: false, message: cause.message, stack: cause.stack, exceptions, fixtureFailures, screenshots, networkArtifact,
    motionStates, motionEvidence,
    artworkNetwork: imageRequests.map(({ url, status, protocol, responseAfterMs, finishedAfterMs, encodedBytes, receivedEncodedBytes, errorText, dataEvents }) => ({ url, status, protocol, responseAfterMs, finishedAfterMs, encodedBytes, receivedEncodedBytes, errorText, dataChunks: dataEvents.length })),
    browserStderr: stderr }, null, 2));
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
