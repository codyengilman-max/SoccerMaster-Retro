import type { Activity, ActivityVariant, AttributeId, DemoSpec, Equipment, Level, SelfReportField, SkillFamilyId, SourceRef, SpaceNeed } from '../types';

export interface Draft {
  readonly id: string;
  readonly title: string;
  readonly focus: string;
  readonly level: Level;
  readonly objective: string;
  readonly steps: readonly [string, string, string];
  readonly cue: string;
  readonly success: string;
  readonly mistake: readonly [string, string];
  readonly easier: string;
  readonly harder: string;
  /** [objective, steps] of the honest ball-only adaptation, when optional equipment is involved. */
  readonly ballOnly?: readonly [string, string];
  readonly optional?: readonly Equipment[];
  readonly space?: SpaceNeed;
  readonly indoor?: boolean;
  readonly outdoor?: boolean;
  readonly striking?: boolean;
  readonly application?: boolean;
  readonly pb?: string | null;
  /** Shared variant group when this entry is equivalent to another. */
  readonly group?: string;
  readonly limits?: readonly string[];
  readonly variants: readonly (readonly [ActivityVariant['factor'], string])[];
  readonly demo: DemoSpec;
  readonly reviewNote?: string;
  readonly sources?: readonly SourceRef[];
}

export interface FamilyDefaults {
  readonly family: SkillFamilyId;
  readonly attribute: AttributeId | null;
  readonly sources: readonly SourceRef[];
  readonly sourceNote: string;
  readonly limitations: readonly string[];
  readonly selfReport?: readonly SelfReportField[];
}

const DEFAULT_REPORT: readonly SelfReportField[] = ['completion', 'rating', 'foot', 'personalBest', 'reflection'];

export function family(f: FamilyDefaults): (d: Draft) => Activity {
  return (d) => ({
    id: d.id,
    version: 1,
    skillFamilyId: f.family,
    variantGroupId: d.group ?? d.id,
    focusId: d.focus,
    title: d.title,
    objective: d.objective,
    relatedAttribute: f.attribute,
    entryLevel: d.level,
    variants: d.variants.map(([factor, change], i) => ({ id: `${d.id}.v${i + 1}`, level: Math.min(5, d.level + i + 1) as Level, factor, change })),
    equipment: { required: ['ball'], optional: d.optional ?? [] },
    space: d.space ?? 'small',
    indoor: d.indoor ?? true,
    outdoor: d.outdoor ?? true,
    strikingArea: d.striking ?? false,
    steps: d.steps,
    cue: d.cue,
    success: d.success,
    mistake: { mistake: d.mistake[0], correction: d.mistake[1] },
    easier: d.easier,
    harder: d.harder,
    ballOnly: d.ballOnly ? { objective: d.ballOnly[0], steps: d.ballOnly[1] } : null,
    application: d.application ?? false,
    selfReport: f.selfReport ?? DEFAULT_REPORT,
    personalBestLabel: d.pb === undefined ? 'Clean repetitions in a row' : d.pb,
    limitations: [...f.limitations, ...(d.limits ?? [])],
    sources: d.sources ?? f.sources,
    sourceNote: f.sourceNote,
    review: {
      schema: 'auto',
      editorial: 'checked',
      coaching: 'pending',
      notes: d.reviewNote ?? 'Original home adaptation written for this game; needs review by a qualified youth coach before release.',
    },
    demo: d.demo,
  });
}
