import type { Profile } from '../shared/protocol';
import type { PersonaArtwork } from './personaArtwork';

function wrapText(context: CanvasRenderingContext2D, value: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const character of value) {
    if (character === '\n') { lines.push(line); line = ''; continue; }
    if (line && context.measureText(line + character).width > width) { lines.push(line); line = character; }
    else line += character;
  }
  if (line) lines.push(line);
  return lines;
}

/** 分享图只接收人物卡字段，不接收 Profile 的行为记录、证据或会话。 */
export async function savePersonaCard(persona: Profile['persona'], artwork: PersonaArtwork, matched: boolean): Promise<void> {
  await document.fonts.ready;
  const image = new Image();
  image.decoding = 'async';
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('人物插画暂时无法加载，请稍后再保存。'));
  });
  image.src = artwork.image;
  await loaded;

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1320;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器暂不支持生成卡片图片。');
  const font = '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
  context.fillStyle = '#102923';
  context.fillRect(0, 0, 900, 1320);
  context.strokeStyle = '#ad9261';
  context.lineWidth = 3;
  context.strokeRect(21, 21, 858, 1278);
  context.lineWidth = 1;
  context.strokeRect(31, 31, 838, 1258);
  context.fillStyle = '#d5c499';
  context.font = `600 24px ${font}`;
  context.fillText('PANDAAI · 交易人格', 53, 83);
  context.textAlign = 'right';
  context.fillText(matched ? `图鉴 ${artwork.number}` : '趣味人物卡', 847, 83);
  context.textAlign = 'left';

  const size = Math.min(image.naturalWidth, image.naturalHeight);
  context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 52, 118, 796, 796);
  context.strokeStyle = '#6b7660';
  context.strokeRect(52, 118, 796, 796);
  context.fillStyle = '#f2f2df';
  let titleSize = 60;
  while (titleSize > 32) {
    context.font = `700 ${titleSize}px ${font}`;
    if (context.measureText(persona.name).width <= 790) break;
    titleSize -= 2;
  }
  context.fillText(persona.name, 58, 1000, 784);
  context.font = `400 29px ${font}`;
  context.fillStyle = '#c5d9ca';
  const lines = wrapText(context, persona.tagline, 780);
  lines.slice(0, 4).forEach((line, index) => context.fillText(line, 58, 1060 + index * 42));
  context.fillStyle = '#adbdac';
  context.font = `400 21px ${font}`;
  context.fillText('趣味标签 · 不代表真实交易能力', 58, 1256);
  if (!matched) {
    context.textAlign = 'right';
    context.font = `400 19px ${font}`;
    context.fillText('通用角色插画', 842, 1256);
  }

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('卡片图片生成失败，请重试。');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pandaai-persona-${artwork.id}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
