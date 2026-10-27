/** The coach-approved All36 package data, imported unchanged from docs/training/all36/package. Framework-free. */
import episodes from '../../../../docs/training/all36/package/episodes.json';
import curriculum from '../../../../docs/training/all36/package/curriculum.json';
import approval from '../../../../docs/training/all36/package/COACH_APPROVAL.json';
import type { PackageCurriculumRow, PackageEpisode, PackageGrade, DisplayBand, PackageRole, Category } from './types';
import type { RoleId } from '../ref/catalog.mjs';

/** SHA-256 of the owner-supplied SoccerMaster_Coach_Approved_All36.zip this data came from. */
export const ALL36_ARCHIVE_SHA256 = '1a57ffe32a17975bf117972e2a304c428abaeda2f41372d22af3e57c4a30fb87';
export const ALL36_VERSION = 'all36.v1';
export const ALL36_EPISODES = episodes as unknown as readonly PackageEpisode[];
export const ALL36_CURRICULUM = curriculum as unknown as readonly PackageCurriculumRow[];
export const ALL36_APPROVAL = approval;

/** Owner decision (PR C answer 1). The package classification is stored next to this band, never replaced by it. */
export const GRADE_BAND: Readonly<Record<PackageGrade, DisplayBand>> = { preferred: 'Elite', acceptable: 'Playable', misread: 'Low-value' };

/** Owner decision (PR C answer 5): DM = 6, CM = 8, ST = 9; the other names are the same. */
export const PACKAGE_ROLE: Readonly<Record<Exclude<PackageRole, 'GK'>, Exclude<RoleId, 'GK'>>> = { CB: 'CB', LB: 'LB', RB: 'RB', DM: '6', CM: '8', LW: 'LW', RW: 'RW', ST: '9' };
export const CATEGORY_ROLES: Readonly<Record<Category, readonly RoleId[]>> = { DEF: ['LB', 'RB', 'CB'], MID: ['6', '8'], FWD: ['LW', 'RW', '9'] };

export function episodeById(id: string): PackageEpisode | undefined {
  return ALL36_EPISODES.find((e) => e.id === id);
}
/** The learner's package role in a situation: the protagonist actor's role. */
export function protagonistRole(e: PackageEpisode): PackageRole {
  const a = e.actors.find((x) => x.id === e.protagonist_id);
  if (!a) throw new Error(`${e.id}: protagonist ${e.protagonist_id} is not an actor`);
  return a.role;
}
