import Phaser from 'phaser';
import type { VenueId } from '../game/venue';
import { depthScaleAt, toScreen, type PitchLayout } from './layout';
import { SidelineReactions, type ReactionEvent, type SidelineActor } from './venueReactions';

const IMAGES = import.meta.glob(
  ['../assets/art/venues/{pinnacle,bell94,scottsdale,westside}/*.{png,webp}', '../assets/art/venues/characters/*.webp'],
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;
const DATA = import.meta.glob('../assets/art/venues/**/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

interface PropPlacement { readonly id: string; readonly x: number; readonly y: number; readonly widthYd: number }
interface ActorPlacement { readonly id: string; readonly character: string; readonly x: number; readonly y: number; readonly team: 'home' | 'away'; readonly seated?: boolean }
interface VenueLayoutData { readonly id: VenueId; readonly name: string; readonly palette: Readonly<Record<string, string>>; readonly pitchYards: readonly [number, number]; readonly props: readonly PropPlacement[]; readonly actors: readonly ActorPlacement[] }
interface PropMeta { readonly anchorPx: readonly [number, number]; readonly size: readonly [number, number] }
interface ClipSpec { readonly anchorPx: readonly [number, number]; readonly cell: readonly [number, number]; readonly neutralBodyHeight: number; readonly clips: Record<string, { frames: string[]; frameRate: number; repeat: number }> }

const ROOT = '../assets/art/venues/';
export const VENUE_LAYOUTS = DATA[`${ROOT}venue-layouts.json`] as readonly VenueLayoutData[];
/** Adult sideline people stand this much taller than a U11 player. */
export const ADULT_HEIGHT = 1.35;
/** Mesh resolution over the 75 x 50 yd pitch (package default). */
const MESH_NX = 20;
const MESH_NY = 14;

export const venueGrassUrl = (id: VenueId): string | undefined => IMAGES[`${ROOT}${id}/grass.webp`];
export const venuePropUrl = (id: VenueId, prop: string): string | undefined => IMAGES[`${ROOT}${id}/${prop}.png`];
export const venueCharacterUrl = (character: string): string | undefined => IMAGES[`${ROOT}characters/${character}.webp`];

/** Ground grid over the pitch, projected with the match's own layout (package buildGroundMesh). */
export function groundMesh(L: PitchLayout, length: number, width: number, nx = MESH_NX, ny = MESH_NY): { xy: number[]; uv: number[]; idx: number[] } {
  const xy: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const p = toScreen(L, { x: (i / nx) * length, y: (j / ny) * width });
      xy.push(p.x, p.y);
      uv.push(i / nx, j / ny);
    }
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const c = a + nx + 1;
      idx.push(a, a + 1, c + 1, a, c + 1, c);
    }
  return { xy, uv, idx };
}

type PropView = { readonly p: PropPlacement; readonly meta: PropMeta; readonly key: string; img?: Phaser.GameObjects.Image };
type ActorView = SidelineActor & { readonly p: ActorPlacement; readonly key: string; readonly spec: ClipSpec; spr?: Phaser.GameObjects.Sprite };

/** One venue's grass material, world-anchored props and sideline people for a regular match (WebGL; flat grass otherwise). */
export class VenueLayer {
  readonly layout: VenueLayoutData;
  readonly missing: string[] = [];
  private mesh?: Phaser.GameObjects.Mesh;
  private readonly props: PropView[] = [];
  private readonly actors: ActorView[] = [];
  private readonly reactions = new SidelineReactions();
  private clock = 0;
  private readonly grassKey: string;

  constructor(private readonly scene: Phaser.Scene, readonly id: VenueId) {
    const layout = VENUE_LAYOUTS.find((v) => v.id === id);
    if (!layout) throw new Error(`Unknown venue ${id}`);
    this.layout = layout;
    this.grassKey = `venue-${id}-grass`;
    const load = scene.load;
    const grass = venueGrassUrl(id);
    if (grass && !scene.textures.exists(this.grassKey)) load.image(this.grassKey, grass);
    for (const p of layout.props) {
      const meta = DATA[`${ROOT}${id}/${p.id}.json`] as PropMeta | undefined;
      const url = venuePropUrl(id, p.id);
      if (!meta || !url) {
        if (!this.missing.includes(`prop:${p.id}`)) this.missing.push(`prop:${p.id}`);
        continue;
      }
      const key = `venue-${id}-${p.id}`;
      if (!scene.textures.exists(key)) load.image(key, url);
      this.props.push({ p, meta, key });
    }
    for (const a of layout.actors) {
      const spec = DATA[`${ROOT}characters/${a.character}.clips.json`] as ClipSpec | undefined;
      const atlas = DATA[`${ROOT}characters/${a.character}.json`] as object | undefined;
      const url = venueCharacterUrl(a.character);
      if (!spec || !atlas || !url) {
        this.missing.push(`actor:${a.character}`);
        continue;
      }
      const key = `venue-char-${a.character}`;
      if (!scene.textures.exists(key)) load.atlas(key, url, atlas);
      this.actors.push({ id: a.id, team: a.team, seated: a.seated === true, clips: spec.clips, p: a, key, spec });
    }
    if (!load.isLoading()) load.start();
  }

  private idleOf(a: ActorView): string {
    return a.seated && a.spec.clips.seated_idle ? 'seated_idle' : 'idle';
  }

  private animKey(a: ActorView, action: string): string {
    return `venue:${a.p.character}:${action}`;
  }

  private ensureObjects(): void {
    const s = this.scene;
    if (!this.mesh && s.textures.exists(this.grassKey) && s.sys.renderer.type === Phaser.WEBGL) {
      this.mesh = s.add.mesh(0, 0, this.grassKey).setDepth(0.5).setName('venue-grass');
      this.mesh.hideCCW = false;
      this.mesh.ignoreDirtyCache = true;
    }
    for (const v of this.props)
      if (!v.img && s.textures.exists(v.key))
        v.img = s.add.image(0, 0, v.key).setOrigin(v.meta.anchorPx[0] / v.meta.size[0], v.meta.anchorPx[1] / v.meta.size[1]).setName(`venue-prop-${v.p.id}`);
    for (const a of this.actors) {
      if (a.spr || !s.textures.exists(a.key)) continue;
      for (const [action, clip] of Object.entries(a.spec.clips)) {
        const key = this.animKey(a, action);
        if (!s.anims.exists(key)) s.anims.create({ key, frames: clip.frames.map((frame) => ({ key: a.key, frame })), frameRate: clip.frameRate, repeat: clip.repeat });
      }
      const spr = s.add.sprite(0, 0, a.key, a.spec.clips[this.idleOf(a)]?.frames[0]).setName(`venue-actor-${a.id}`);
      spr.setOrigin(a.spec.anchorPx[0] / a.spec.cell[0], a.spec.anchorPx[1] / a.spec.cell[1]);
      spr.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.play(this.animKey(a, this.idleOf(a))));
      // Idle loops start at a per-actor frame so the crowd never moves in lockstep.
      spr.play({ key: this.animKey(a, this.idleOf(a)), startFrame: (a.p.x * 7 + a.p.y) % Math.max(1, a.spec.clips[this.idleOf(a)]?.frames.length ?? 1) | 0 });
      a.spr = spr;
    }
  }

  /** Run-off and surrounding ground colours from the venue layout. */
  get palette(): { runoff: number; desert: number } {
    const c = (v: string | undefined, d: number): number => (v ? Number.parseInt(v.replace('#', ''), 16) : d);
    return { runoff: c(this.layout.palette.runoff, 0x5e883e), desert: c(this.layout.palette.desert, 0xc6a678) };
  }

  /** True once the grass material is drawn (the scene then tints its stripes instead of painting them). */
  get grassReady(): boolean {
    return !!this.mesh;
  }

  /** Re-project grass, props and people with the current layout. `bodyH` is a U11 player's on-screen height at depth scale 1. */
  draw(L: PitchLayout, length: number, width: number, bodyH: number, view: { width: number; height: number }): void {
    this.ensureObjects();
    if (this.mesh) {
      const m = this.mesh;
      const g = groundMesh(L, length, width);
      if (m.faces.length !== g.idx.length / 3) {
        m.clear();
        m.addVertices(g.xy.map((v, i) => (i % 2 === 0 ? v : -v)), g.uv, g.idx);
        m.setOrtho(m.width, m.height);
      }
      // The mesh projects its vertices in preUpdate, which has already run this frame, so place them in screen space
      // here (ortho(width, height) at the origin maps (x, -y) to (x, y) one-to-one); the grass then never lags or
      // collapses away from the markings drawn this frame.
      m.faces.forEach((face, k) => {
        [face.vertex1, face.vertex2, face.vertex3].forEach((v, n) => {
          const i = g.idx[k * 3 + n] ?? 0;
          const x = g.xy[i * 2] ?? 0;
          const y = g.xy[i * 2 + 1] ?? 0;
          v.x = x;
          v.y = -y;
          v.vx = x;
          v.vy = y;
        });
      });
    }
    const onScreen = (x: number, y: number, m: number): boolean => x > -m && x < view.width + m && y > -m && y < view.height + m * 2;
    for (const v of this.props) {
      if (!v.img) continue;
      const sp = toScreen(L, v.p);
      const k = depthScaleAt(L, sp.y);
      const w = v.p.widthYd * L.scale * k;
      v.img.setScale(w / v.meta.size[0]).setPosition(sp.x, sp.y).setDepth(100 + sp.y).setVisible(onScreen(sp.x, sp.y, w));
    }
    for (const a of this.actors) {
      if (!a.spr) continue;
      const sp = toScreen(L, a.p);
      const k = depthScaleAt(L, sp.y);
      const h = bodyH * ADULT_HEIGHT * k;
      const vis = onScreen(sp.x, sp.y, h);
      a.spr.setScale(h / a.spec.neutralBodyHeight).setPosition(sp.x, sp.y).setDepth(100 + sp.y).setVisible(vis);
      if (!vis && a.spr.anims.isPlaying) a.spr.anims.pause();
      else if (vis && a.spr.anims.isPaused) a.spr.anims.resume();
    }
  }

  /** Advance the presentation clock (held while paused, so reactions never double up on resume). */
  tick(dtMs: number, paused: boolean): void {
    for (const a of this.actors) {
      if (!a.spr) continue;
      if (paused && a.spr.anims.isPlaying) a.spr.anims.pause();
    }
    if (paused) return;
    this.clock += dtMs;
    this.reactions.update(this.clock, (actor, action) => {
      const a = actor as ActorView;
      if (a.spr && this.scene.anims.exists(this.animKey(a, action))) a.spr.play(this.animKey(a, action));
    });
  }

  react(event: ReactionEvent): void {
    this.reactions.onEvent(event, this.actors, this.clock);
  }

  /** Test and diagnostics view. */
  snapshot(): {
    id: VenueId;
    grass: boolean;
    grassFaces: number;
    props: number;
    actors: number;
    headTop: number | null;
    missing: readonly string[];
    anims: Record<string, string>;
  } {
    // Sideline cells put the feet at y 120 with a ~100 px body, so a head sits ~100 cell px above the feet.
    const heads = this.actors.filter((a) => a.spr?.visible).map((a) => (a.spr?.y ?? 0) - 100 * (a.spr?.scaleY ?? 0));
    return {
      id: this.id,
      grass: !!this.mesh,
      grassFaces: this.mesh?.totalRendered ?? 0,
      headTop: heads.length ? Math.min(...heads) : null,
      props: this.props.filter((v) => v.img?.visible).length,
      actors: this.actors.filter((a) => a.spr?.visible).length,
      missing: this.missing,
      anims: Object.fromEntries(this.actors.map((a) => [a.id, a.spr?.anims.currentAnim?.key ?? ''])),
    };
  }

  destroy(): void {
    this.mesh?.destroy();
    for (const v of this.props) v.img?.destroy();
    for (const a of this.actors) a.spr?.destroy();
    this.reactions.reset();
  }
}
