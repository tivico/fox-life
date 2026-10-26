import { isLivingAction } from './LivingActivity.ts';
import { isGardenAction } from './GardenActivity.ts';
import { isKitchenAction } from './KitchenActivity.ts';

// Spots and props that only one fox can use at a time. The double bed and stretching are shared.
export type ActivityGroup = 'reading' | 'dining' | 'cleaning' | 'play' | 'living' | 'garden' | 'kitchen';
export function activityGroup(kind: string): ActivityGroup | null {
  if (kind === 'Bookshelf') return 'reading';
  if (kind === 'Food') return 'dining';
  if (kind === 'Clean') return 'cleaning';
  if (kind === 'Play') return 'play';
  if (isLivingAction(kind)) return 'living';
  if (isGardenAction(kind)) return 'garden';
  if (isKitchenAction(kind)) return 'kitchen';
  return null;
}

/** Used spots and accepted invitations' reservations. A fox may hold both while safely finishing an activity. */
export class Household {
  private readonly claims = new Map<ActivityGroup, object>();
  free(group: ActivityGroup | null, who: object) {
    if (!group) return true;
    const owner = this.claims.get(group);
    return !owner || owner === who;
  }
  claim(group: ActivityGroup | null, who: object) { if (group) this.claims.set(group, who); }
  /** A shared plan may take over its members' old spot while they safely finish, never an outsider's. */
  claimTogether(group: ActivityGroup, plan: object, members: readonly object[]) {
    const owner = this.claims.get(group);
    if (owner && !members.includes(owner)) return false;
    this.claims.set(group, plan);
    return true;
  }
  release(who: object) { for (const [group, owner] of this.claims) if (owner === who) this.claims.delete(group); }
  owner(group: ActivityGroup | null) { return group ? this.claims.get(group) ?? null : null; }
}
