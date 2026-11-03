/**
 * Seeded test player for Driveway Dribbling (framework-free): used by unit tests, threshold tuning and
 * browser-test automation. It only uses the player's inputs (stick + double-tap SHOOT), never the sim internals
 * beyond what is on screen. `skill` 0..1 sets reaction lag, aim error and how often it goes for targets.
 */
import { createRng } from '../rng';
import { DRIVEWAY } from './config';
import type { DrivewaySim } from './sim';

export class DrivewayBot {
  private rnd: () => number;
  private tap: number[] = [];
  private aimX: number;
  private nextThink = 0;

  constructor(readonly skill: number, seed: number) {
    this.rnd = createRng(seed ^ 0xb07);
    this.aimX = DRIVEWAY.player.startX;
  }

  /** Plays one frame of `dt` seconds: decides inputs, then advances the sim. */
  frame(sim: DrivewaySim, dt: number): void {
    if (sim.phase === 'playing') this.think(sim);
    sim.update(dt);
  }

  private think(sim: DrivewaySim): void {
    const t = sim.t;
    const p = sim.player;
    if (this.tap.length && t >= this.tap[0]!) {
      this.tap.shift();
      if (this.tap.length % 2 === 0) sim.release();
      else sim.press();
    }
    if (t >= this.nextThink) {
      this.nextThink = t + 0.08 + (1 - this.skill) * 0.35 * this.rnd();
      // Steer for the open range of the next row still to pass the player, nearest first.
      // A row clears the player once it has travelled from the top of the box past the player's feet.
      const pass = (DRIVEWAY.player.maxY - p.y + 1) / -(sim.rows[0]?.spawns[0]?.vy ?? -5);
      const ahead = sim.rows.find((r) => r.arrive + pass > t);
      if (ahead) {
        let best = this.aimX;
        let bestD = Infinity;
        for (const [a, c] of ahead.free) {
          const x = Math.max(a + 0.1, Math.min(c - 0.1, p.x));
          const d = Math.abs(x - p.x) + (c - a < 0.6 ? 0.8 : 0);
          if (d < bestD) { bestD = d; best = (x + (a + c) / 2) / 2; }
        }
        this.aimX = best + (1 - this.skill) * (this.rnd() - 0.5) * 1.6;
      }
      // Go for a breakable target lined up ahead when the ball is ready.
      if (sim.canShoot && !this.tap.length && this.rnd() < 0.25 + this.skill * 0.75) {
        const tgt = sim.objects.find((o) => o.state === 'live' && o.cat === 'breakable' && o.y > p.y + 1.5 && o.y < p.y + 12 && Math.abs(o.x - p.x) < o.r + 0.1);
        if (tgt) this.tap = [t + 0.0, t + 0.06, t + 0.12, t + 0.18];
      }
    }
    const dx = this.aimX - p.x;
    sim.setMove(Math.max(-1, Math.min(1, dx * 2.5)), (DRIVEWAY.player.startY - p.y) * 0.8);
  }
}
