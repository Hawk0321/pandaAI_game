/** Decorative, synthetic interface art. It contains no real level or future data. */
export function HomeVisual() {
  return <div className="home-visual" aria-hidden="true">
    <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
    <div className="preview-terminal">
      <div className="terminal-top"><span><i /> 匿名行情</span><span>界面示意</span></div>
      <div className="terminal-title"><span>每个选择<br /><b>都有迹可循。</b></span><span className="terminal-symbol">↗</span></div>
      <svg viewBox="0 0 420 170" fill="none">
        {[35, 75, 115, 155].map(y => <path key={y} d={`M12 ${y}H408`} stroke="#47776a" strokeOpacity=".25" strokeDasharray="3 6" />)}
        <path d="M12 130L42 118L67 132L94 103L122 110L150 86L179 99L205 63L234 78L263 49L291 65L321 35L350 46L380 18L408 27" stroke="#9ce5cb" strokeWidth="3" strokeLinejoin="round" />
        <path d="M12 145C90 143 107 119 164 119S247 91 291 84S365 68 408 48" stroke="#dfc48a" strokeWidth="2" strokeDasharray="5 5" />
        {[42, 94, 150, 205, 263, 321, 380].map((x, i) => <g key={x} stroke={i % 3 === 0 ? '#e7ae9f' : '#9ce5cb'}><path d={`M${x} ${121 - i * 15}v30`} /><rect x={x - 4} y={126 - i * 15} width="8" height="16" fill="currentColor" className={i % 3 === 0 ? 'visual-candle-down' : 'visual-candle-up'} /></g>)}
      </svg>
      <div className="terminal-bottom"><span>观察走势</span><span>寻找证据</span><span>做出决定</span></div>
    </div>
    <div className="preview-skill"><span className="preview-skill-icon">◇</span><div><small>完成探索后解锁</small><strong>属于你的策略技能卡</strong></div><span>↗</span></div>
    <span className="visual-caption">从一次选择，走向下一次探索</span>
  </div>;
}

export function PandaMark() {
  return <svg className="panda-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true"><circle cx="9" cy="10" r="6" fill="#9ce5cb" /><circle cx="27" cy="10" r="6" fill="#9ce5cb" /><rect x="5" y="8" width="26" height="24" rx="12" fill="#d5f3e4" /><ellipse cx="12" cy="19" rx="4" ry="5" transform="rotate(25 12 19)" fill="#163b31" /><ellipse cx="24" cy="19" rx="4" ry="5" transform="rotate(-25 24 19)" fill="#163b31" /><circle cx="13" cy="18" r="1" fill="#d5f3e4" /><circle cx="23" cy="18" r="1" fill="#d5f3e4" /><path d="M16 25h4l-2 3z" fill="#163b31" /></svg>;
}
