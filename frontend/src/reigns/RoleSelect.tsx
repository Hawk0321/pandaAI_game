// 选角页：游戏入口。三个可玩角色 + 一张“待开发”灰色卡片（不可进入）。
// 角色数据来自 roles.ts，这里只负责展示；属性名称和含义按角色不同，让玩家一眼看出玩法差异。
import { useEffect, useRef } from 'react';
import { COMING_SOON_ROLE, ROLES, ROLE_IDS } from './roles';
import { STAT_KEYS } from './types';
import type { RoleId } from './types';

export interface RoleSelectProps {
  readonly onSelect: (role: RoleId) => void;
  /** 从结局页回来时为 true，把焦点放到标题，方便读屏用户知道页面换了。 */
  readonly focusHeading?: boolean;
}

export function RoleSelect({ onSelect, focusHeading = false }: RoleSelectProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (focusHeading) headingRef.current?.focus(); }, [focusHeading]);

  return (
    <div className="reigns-select">
      <div className="reigns-select-head">
        <h2 className="reigns-select-title" ref={headingRef} tabIndex={-1}>选一个身份开局</h2>
        <p className="reigns-select-sub">身份不同，四条数值的叫法和风险点也不同。</p>
      </div>

      <ul className="reigns-roles">
        {ROLE_IDS.map((id) => {
          const role = ROLES[id];
          const nameId = `reigns-role-${id}-name`;
          const descId = `reigns-role-${id}-desc`;
          return (
            <li key={id} className="reigns-role-item">
              <button
                type="button"
                className="reigns-role"
                aria-labelledby={nameId}
                aria-describedby={descId}
                onClick={() => onSelect(id)}
              >
                <span className="reigns-role-top">
                  <span className="reigns-role-emoji" aria-hidden="true">{role.emoji}</span>
                  <span className="reigns-role-id">
                    <span className="reigns-role-name" id={nameId}>{role.name}</span>
                    <span className="reigns-role-tagline">{role.tagline}</span>
                  </span>
                </span>
                <span id={descId} className="reigns-role-desc">
                  <span className="reigns-role-intro">{role.intro}</span>
                  <span className="reigns-role-stats">
                    {STAT_KEYS.map((key) => (
                      <span key={key} className="reigns-role-stat">
                        <span className="reigns-role-stat-label">{role.stats[key].label}</span>
                        <span className="reigns-role-stat-meaning">{role.stats[key].meaning}</span>
                      </span>
                    ))}
                  </span>
                </span>
                <span className="reigns-role-go" aria-hidden="true">扮演 {role.name} →</span>
              </button>
            </li>
          );
        })}

        <li className="reigns-role-item">
          <button
            type="button"
            className="reigns-role reigns-role-soon"
            aria-disabled="true"
            aria-labelledby="reigns-role-soon-name"
            onClick={(e) => e.preventDefault()}
          >
            <span className="reigns-role-top">
              <span className="reigns-role-emoji" aria-hidden="true">{COMING_SOON_ROLE.emoji}</span>
              <span className="reigns-role-id">
                <span className="reigns-role-name" id="reigns-role-soon-name">{COMING_SOON_ROLE.name}（{COMING_SOON_ROLE.tagline}）</span>
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  );
}
