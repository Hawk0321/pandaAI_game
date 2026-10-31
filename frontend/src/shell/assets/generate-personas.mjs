import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const config = JSON.parse(await readFile(`${process.env.USERPROFILE}/.config/magpie/providers.json`, 'utf8'));
const provider = config.providers.find((item) => item.id === 'openai-next');
const base = `${provider.chat}/images/generations`;
const personas = [
  ['puffin', 'a charming puffin explorer with a tiny teal scarf, riding a curling emerald wave while following a small flock, wind-blown adventurous expression, holding a tiny unlabeled pennant'],
  ['raccoon', 'a curious raccoon explorer with round spectacles and a little brass lantern, discovering a blank map and compass in a lush valley, walking upstream against a flowing river'],
  ['gecko', 'a brave small green gecko adventurer with a rounded shield and tiny rope cutter, freeing its tail from a tangled red thread, standing on a mossy cliff with a clear escape path'],
  ['squirrel', 'a meticulous squirrel scholar with a dark teal waistcoat and small round spectacles, holding a wooden abacus and organizing blank field notes under a warm lantern'],
  ['bat', 'a cute wide-eyed bat night explorer wearing a little midnight-blue cape, holding a glowing brass lantern above moonlit mountain peaks, slightly sleepy but determined'],
  ['panda', 'a thoughtful panda explorer wearing a forest-green travel scarf, standing between two winding paths while holding a small pendulum compass, looking from one map to the other'],
];
const style = 'Square 1:1 original fantasy storybook game illustration, full body anthropomorphic animal adventurer centered, expressive friendly eyes, hand-painted premium board-game art with finely brushed gouache texture, deep emerald and near-black teal background, warm copper-gold rim light and restrained mint highlights, rich painterly materials, cohesive collectible trading-personality card art. No writing, letters, numbers, logos, watermark, UI, monetary symbols, performance claims, existing copyrighted characters, photorealism, extra characters.';
const out = process.argv[2];
if (!out) throw new Error('Provide a temporary output JSON path outside the repository');
await writeFile(out, JSON.stringify(await Promise.all(personas.map(async ([id, subject]) => {
  const response = await fetch(base, { method: 'POST', headers: { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-image-2.5', size: '1024x1024', quality: 'high', prompt: `${subject}. ${style}` }) });
  if (!response.ok) throw new Error(`${id}: ${response.status} ${await response.text()}`);
  const data = await response.json();
  return { id, data: data.data[0].b64_json };
})), 'utf8'));
