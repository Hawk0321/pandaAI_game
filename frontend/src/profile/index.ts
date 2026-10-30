import sampleProfile from "../../../data/samples/sample_profile.json";
import type { AnalyzeInput, LevelIndex, Profile } from "../shared/protocol";

export type { AnalyzeInput } from "../shared/protocol";

/** 临时示例分析器：由 D 替换，判断内容均来自仓库的 sample_profile.json。 */
export async function analyze(input: AnalyzeInput): Promise<Profile> {
  const profile = structuredClone(sampleProfile) as Profile;
  profile.session_id = input.session_id;
  profile.generated_at = new Date().toISOString();
  profile.round = input.round;
  return profile;
}

/** 占位实现不自行编造补充关卡选择规则。 */
export function pickNextLevel(_profile: Profile, _index: LevelIndex, _playedIds: string[]): string | null {
  return null;
}
