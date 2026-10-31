// 交易滑牌入口页：手机竖屏优先，电脑也可用（拖动或 ← → 键）。
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ReignsGame } from './ReignsGame';
import '../styles.css';
import '../theme.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ReignsGame /></StrictMode>);
