/**
 * Sideline reactions from authoritative match events (port of the venue package's SidelineReactions). Each event id
 * plays once; starts are staggered and each actor has a cooldown. No randomness, so the simulation stream is untouched.
 */
export type ReactionEvent = { readonly id: string; readonly type: 'goal' | 'save' | 'miss'; readonly team: 'home' | 'away' };

export interface SidelineActor {
  readonly id: string;
  readonly team: 'home' | 'away';
  readonly clips: Readonly<Record<string, unknown>>;
  readonly seated?: boolean;
}

export const REACTION_COOLDOWN_MS = 3500;

export class SidelineReactions {
  private readonly seen = new Set<string>();
  private queue: { at: number; actor: SidelineActor; action: string }[] = [];
  private readonly cooldowns = new Map<string, number>();

  onEvent(event: ReactionEvent, actors: readonly SidelineActor[], now: number): void {
    if (!event.id || this.seen.has(event.id)) return;
    this.seen.add(event.id);
    if (this.seen.size > 512) this.seen.delete(this.seen.values().next().value as string);
    actors.forEach((a, i) => {
      if ((this.cooldowns.get(a.id) ?? 0) > now) return;
      let action: string | null = null;
      if (event.type === 'goal') action = a.team === event.team ? 'cheer' : 'disappointed';
      else if (event.type === 'save') action = a.team === event.team ? 'clap' : 'disappointed';
      else action = a.team === event.team ? 'disappointed' : null;
      if (!action || !a.clips[action]) return;
      if (a.seated) {
        action = a.clips.seated_clap ? 'seated_clap' : null;
        if (!action) return;
      }
      this.queue.push({ at: now + 120 + ((i * 97) % 650), actor: a, action });
      this.cooldowns.set(a.id, now + REACTION_COOLDOWN_MS);
    });
  }

  update(now: number, play: (actor: SidelineActor, action: string) => void): void {
    const pending: typeof this.queue = [];
    for (const q of this.queue) {
      if (q.at <= now) play(q.actor, q.action);
      else pending.push(q);
    }
    this.queue = pending;
  }

  reset(): void {
    this.seen.clear();
    this.queue = [];
    this.cooldowns.clear();
  }
}
