import Phaser from 'phaser';
import { PALETTE } from './theme';

export const TEXTURES = {
  player: 'placeholder-player',
  ball: 'placeholder-ball',
} as const;

export const PLAYER_TEXTURE_SIZE = { width: 48, height: 72 } as const;
export const BALL_TEXTURE_SIZE = { width: 28, height: 28 } as const;

/** Original placeholder art drawn with vector shapes. Generated once per game. */
export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(TEXTURES.player)) drawPlayer(scene);
  if (!scene.textures.exists(TEXTURES.ball)) drawBall(scene);
}

function drawPlayer(scene: Phaser.Scene): void {
  const { width, height } = PLAYER_TEXTURE_SIZE;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const outline = 3;
  g.lineStyle(outline, PALETTE.ink, 1);

  // Boots
  g.fillStyle(PALETTE.ink, 1);
  g.fillRoundedRect(11, 64, 11, 6, 2);
  g.fillRoundedRect(26, 64, 11, 6, 2);
  // Socks
  g.fillStyle(PALETTE.tomato, 1);
  g.fillRect(14, 52, 7, 13);
  g.fillRect(27, 52, 7, 13);
  g.strokeRect(14, 52, 7, 13);
  g.strokeRect(27, 52, 7, 13);
  // Shorts
  g.fillStyle(PALETTE.sand, 1);
  g.fillRoundedRect(12, 42, 24, 12, 3);
  g.strokeRoundedRect(12, 42, 24, 12, 3);
  // Arms
  g.fillStyle(PALETTE.skin, 1);
  g.fillRoundedRect(4, 26, 7, 16, 3);
  g.fillRoundedRect(37, 26, 7, 16, 3);
  g.strokeRoundedRect(4, 26, 7, 16, 3);
  g.strokeRoundedRect(37, 26, 7, 16, 3);
  // Shirt
  g.fillStyle(PALETTE.tomato, 1);
  g.fillRoundedRect(9, 22, 30, 23, 6);
  g.strokeRoundedRect(9, 22, 30, 23, 6);
  // Shirt stripe + number badge
  g.fillStyle(PALETTE.mustard, 1);
  g.fillRect(11, 30, 26, 4);
  g.fillStyle(PALETTE.cream, 1);
  g.fillCircle(24, 38, 4);
  // Head
  g.fillStyle(PALETTE.skin, 1);
  g.fillCircle(24, 13, 10);
  g.strokeCircle(24, 13, 10);
  // Hair
  g.fillStyle(PALETTE.hair, 1);
  g.beginPath();
  g.arc(24, 12, 10, Math.PI, 0, false);
  g.closePath();
  g.fillPath();
  g.strokeCircle(24, 13, 10);
  // Eyes
  g.fillStyle(PALETTE.ink, 1);
  g.fillCircle(20, 15, 1.5);
  g.fillCircle(28, 15, 1.5);

  g.generateTexture(TEXTURES.player, width, height);
  g.destroy();
}

function drawBall(scene: Phaser.Scene): void {
  const { width, height } = BALL_TEXTURE_SIZE;
  const cx = width / 2;
  const cy = height / 2;
  const r = width / 2 - 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(PALETTE.cream, 1);
  g.fillCircle(cx, cy, r);
  g.fillStyle(PALETTE.ink, 1);
  const pentagon: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    pentagon.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r * 0.38, cy + Math.sin(a) * r * 0.38));
  }
  g.fillPoints(pentagon, true);
  g.lineStyle(1.5, PALETTE.ink, 1);
  for (const p of pentagon) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    g.lineBetween(p.x, p.y, cx + dx * 2.2, cy + dy * 2.2);
  }
  g.lineStyle(2.5, PALETTE.ink, 1);
  g.strokeCircle(cx, cy, r);

  g.generateTexture(TEXTURES.ball, width, height);
  g.destroy();
}
