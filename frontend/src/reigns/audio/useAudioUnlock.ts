import { useEffect } from 'react';
import { audio } from './audioManager';

/**
 * 第一次用户手势（点按、按键、触摸）时调用 audio.unlock()，然后移除所有监听器。
 * 用捕获阶段注册，保证先于按钮自己的 onClick 执行，那个点击里的音效才不会因为还没解锁被吞掉。
 * 不在挂载时直接 unlock：没有手势的 AudioContext 会停在 suspended，音乐会被浏览器拦截。
 */
const GESTURES = ['pointerdown', 'touchend', 'keydown', 'click'] as const;

export function useAudioUnlock(): void {
  useEffect(() => {
    const options = { capture: true } as const;
    const unlock = () => {
      audio.unlock();
      for (const type of GESTURES) window.removeEventListener(type, unlock, options);
    };
    for (const type of GESTURES) window.addEventListener(type, unlock, options);
    return () => {
      for (const type of GESTURES) window.removeEventListener(type, unlock, options);
    };
  }, []);
}
