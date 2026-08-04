import type { ActionTag } from "./actions";

type Activity = {
  tag: ActionTag;
  maxParticipants: number;
  minParticipants: number;
};

export default class GroupActivityCoordinator {
  private activities: Activity[];

  private pending: Map<ActionTag, number>;

  constructor(activities: Activity[]) {
    this.activities = activities;
    this.pending = new Map();
  }

  requestActivity(activity: ActionTag): boolean {
    const existingActivity = this.getActivity(activity);
    const existingPending = this.pending.get(activity);

    if (existingPending !== undefined) {
      if (existingPending >= existingActivity.maxParticipants) {
        return false;
      }

      this.pending.set(activity, existingPending + 1);
      return true;
    } else {
      this.pending.set(activity, 1);
      return true;
    }
  }

  isHappening(tag: ActionTag) {
    const activity = this.getActivity(tag);

    return (this.pending.get(tag) ?? 0) >= activity.minParticipants;
  }

  getActivity(activity: ActionTag) {
    const a = this.activities.find((a) => a.tag === activity);

    if (a === undefined) throw new Error(`Activity not found ${activity}`);

    return a;
  }

  startActivity(activity: ActionTag): void {
    this.pending.delete(activity);
  }

  getPending(): ActionTag[] {
    return [...this.pending.keys()];
  }
}
