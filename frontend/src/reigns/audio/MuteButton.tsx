// 右上角静音键：订阅 audio 设置，图标实时跟随；卸载时取消订阅。
import { useEffect, useState } from 'react';
import { audio } from './audioManager';

export function MuteButton() {
  const [muted, setMuted] = useState(() => audio.getSettings().muted);
  useEffect(() => {
    setMuted(audio.getSettings().muted);
    return audio.subscribe((s) => setMuted(s.muted));
  }, []);

  return (
    <button
      type="button"
      className="reigns-mute"
      aria-pressed={muted}
      aria-label={muted ? '取消静音' : '静音'}
      title={muted ? '取消静音' : '静音'}
      onClick={() => audio.setMuted(!audio.getSettings().muted)}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
    </button>
  );
}
