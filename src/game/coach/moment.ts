import type { CoachFacts } from './facts';
import type { EvaluatedOption, FactFeature, MomentView, NameFn, TemplateDef } from './types';

/** True when the live facts actually contain every feature the template declares it reads. */
export function featuresPresent(t: TemplateDef, f: CoachFacts): boolean {
  return t.requires.every((r: FactFeature) => {
    switch (r) {
      case 'carrier':
      case 'pressure':
      case 'passingLanes':
      case 'support':
      case 'space':
        return r === 'space' ? (!!f.carrier || !!f.defend) : !!f.carrier || (r === 'pressure' && !!f.defend);
      case 'shot':
        return !!f.shot;
      case 'defend':
        return !!f.defend;
      case 'cover':
        return !!f.defend && (f.defend.coverId !== null || f.defend.presserId !== null);
      case 'score':
        return Number.isFinite(f.scoreDiff);
      case 'time':
        return f.timeLeft !== null;
      case 'formation':
        return !!f.formation;
      case 'stoppage':
        return !!f.stopped;
    }
  });
}

/** Eligibility only: features present and the template's own rule. Never throws. */
export function isEligible(t: TemplateDef, f: CoachFacts): boolean {
  if (!featuresPresent(t, f)) return false;
  if (!!t.stoppageOnly !== (f.situation === 'stopped')) return false;
  try {
    return t.eligible(f) === true;
  } catch {
    return false;
  }
}

/**
 * Evaluation: populate the question and grade every available option from the frozen facts.
 * Returns null if the template is not eligible or would show fewer than three credible options.
 */
export function buildMoment(t: TemplateDef, f: CoachFacts, names: NameFn, momentId: string): MomentView | null {
  if (!isEligible(t, f)) return null;
  try {
    const options: EvaluatedOption[] = [];
    for (const o of t.options) {
      if (o.available && !o.available(f)) continue;
      const grade = o.grade(f);
      options.push({ id: o.id, text: o.text(f, names), grade, feedback: o.feedback(f, names, grade), intention: o.intention(f) });
    }
    if (options.length < 3 || options.length > 4) return null;
    if (!options.some((o) => o.grade === 'strong')) return null;
    return {
      momentId,
      templateId: t.id,
      templateVersion: t.version,
      topic: t.topic,
      objective: t.objective,
      question: t.question(f, names),
      options,
      highlights: t.highlights(f),
    };
  } catch {
    return null;
  }
}
