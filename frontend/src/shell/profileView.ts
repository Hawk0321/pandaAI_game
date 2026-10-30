import sample from '../../../data/samples/sample_profile.json';
import type { Profile } from '../shared/protocol';

/** 仅识别仓库固定样例；is_sample 本身不能表明分析器是否计算了本局行为。 */
export function isFixedSampleProfile(profile: Profile): boolean {
  const content = (value: Profile) => ({
    schema: value.schema, is_sample: value.is_sample, method: value.method,
    dimensions: value.dimensions, persona: value.persona, summary: value.summary,
    needs_more: value.needs_more, changes: value.changes,
  });
  return JSON.stringify(content(profile)) === JSON.stringify(content(sample as Profile));
}
