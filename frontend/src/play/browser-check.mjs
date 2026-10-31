// 与 C 的浏览器自测一样使用 Chrome CDP，不增加测试依赖。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'pandaai-play-'));
const child = spawn(process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank']);
const wait = ms => new Promise(r => setTimeout(r,ms));
async function until(read) { for(let i=0;i<200;i++){const value=await read();if(value)return value;await wait(100);}throw new Error('Browser wait timed out'); }
let socket;
try {
  const port = await until(async()=>{try{return (await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{return null;}});
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let seq=0;const pending=new Map();const requests=[];const logs=[];const exceptions=[];
  socket.addEventListener('message',message=>{const m=JSON.parse(message.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);if(m.method==='Runtime.consoleAPICalled')logs.push(m.params);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.result.description);return r.result.value;};
  const click=async text=>{await until(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent===${JSON.stringify(text)}&&!b.disabled)`));await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(text)}&&!b.disabled).click()`);};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  const samples=JSON.parse(await fs.readFile(new URL('../../../data/samples/sample_events.json',import.meta.url),'utf8'));
  const keys=Object.fromEntries(samples.events.map(e=>[e.type,Object.keys(e.data).sort()]));keys.stop_triggered=['pnl','step'];
  for(const mode of ['research','heavy','flat']){
    const start=requests.length;
    await send('Page.navigate',{url:`http://127.0.0.1:5173/src/play/demo.html?${mode==='flat'?'supplementary':''}`});
    await until(()=>evaluate('Boolean(window.playEvents?.length)'));
    assert.equal(await evaluate('window.revealCalls'),0);
    assert.equal(requests.slice(start).some(url=>url.includes('L01.reveal')),false,'no reveal import before decision');
    if(mode==='research')await evaluate(`(()=>{for(const b of document.querySelectorAll('.play-clues button'))if(!b.disabled)b.click()})()`);
    if(mode==='heavy'){await click('做多');await click('重仓 100%');await click('5');await click('不设止损');}
    if(mode==='flat'){await click('观望');await click('3');await click('不设止损');}
    if(mode==='research'){await click('做多');await click('轻仓 20%');await click('3');await click('5%');}
    await click('提交决定，揭晓走势');
    await until(()=>evaluate("Boolean(document.querySelector('.play-actions'))"));
    for(let i=0;i<3;i++){
      if(mode==='flat'&&i===0){await click('入场做空');await click('加仓');}
      else await click(i===2&&mode==='heavy'?'平仓':'持有');
    }
    await until(()=>evaluate('Boolean(window.playDone)'));
    const events=await evaluate('window.playEvents');
    assert.equal(events.filter(e=>e.type==='level_start').length,1,'StrictMode starts once');
    assert.equal(events.filter(e=>e.type==='hold_step').length,3);
    assert.equal(events.at(-1).type,'level_end');
    for(const event of events)assert.deepEqual(Object.keys(event.data).sort(),keys[event.type],event.type);
    assert.equal(await evaluate('window.revealCalls'),1);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile width');
    const decision=events.find(e=>e.type==='decision').data;
    if(mode==='research'){assert.ok(decision.clues_opened.length>0);assert.equal(decision.size,0.2);assert.ok(events.filter(e=>e.type==='clue_open').at(-1).data.budget_left>=0);}
    if(mode==='heavy'){assert.equal(decision.size,1);assert.deepEqual(decision.clues_opened,[]);}
    if(mode==='flat'){assert.equal(decision.size,0);assert.equal(events.find(e=>e.type==='hold_step').data.position_after,-0.2);}
    console.log(JSON.stringify({mode,events,result:await evaluate('window.playDone')}));
  }
  assert.deepEqual(exceptions,[]);
  assert.ok(logs.length>0,'console events captured');
  console.log('PASS: three mobile-emulated paths, event schemas, reveal isolation, console output');
} finally {socket?.close();child.kill();await wait(300);await fs.rm(profile,{recursive:true,force:true});}
