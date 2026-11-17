import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import type {
	Schedule,
	ScheduleShift,
} from "@/features/scheduling/schedules/api";

/** What changing the roster by hand needs; given only to someone who may change it now. */
export type RosterEditing = {
	target: RosterChangeTarget;
	/** The roster revision on screen. */
	revision: number;
	/** The schedule's frozen shifts, with their days and roles. */
	shifts: ReadonlyArray<ScheduleShift>;
	/** The schedule's types for a day not worked; empty from an older API. */
	nonWorkingDayTypes: ReadonlyArray<string>;
	/** The roster is published: each change tells the people whose days it changes, so it asks first. */
	notifiesMembers: boolean;
	/** Given to someone who may change leave here too: the leave choices beside the roster's own. */
	leave?: { viewerMembershipId: string };
	/**
	 * On a published roster: its cover offers, read by the page. A change that
	 * adds or moves work then goes out as an offer, and Issues lists them.
	 */
	coverOffers?: {
		offers: ReadonlyArray<CoverOffer>;
		/** They couldn't be read: Issues says so, with Try again. */
		failed: boolean;
		retry: () => void;
	};
};

/** What the roster page knows that the editor is built from. */
export type RosterEditingSource = {
	/** Where hand changes go; undefined unless the viewer may change the roster now. */
	target: RosterChangeTarget | undefined;
	schedule: Pick<Schedule, "rosterRevision" | "nonWorkingDayTypes" | "status">;
	/** The frozen shifts the editor offers, as read under the editing key. */
	shifts: ReadonlyArray<ScheduleShift>;
	/** The roster's cover offers as read; the editor gets them only on a published roster. */
	coverOffers: NonNullable<RosterEditing["coverOffers"]>;
	/** Given when the viewer may read and review leave at the Department too. */
	leave: RosterEditing["leave"];
};

/**
 * What changing the roster by hand needs, or undefined for someone who may
 * not change it now. A published roster tells the people whose days change,
 * so it asks first and sends a change that adds or moves work as a cover offer.
 */
export const rosterEditingOf = ({
	target,
	schedule,
	shifts,
	coverOffers,
	leave,
}: RosterEditingSource): RosterEditing | undefined => {
	if (!target) return undefined;
	const published = schedule.status === "PUBLISHED";
	return {
		target,
		revision: schedule.rosterRevision,
		shifts,
		nonWorkingDayTypes: schedule.nonWorkingDayTypes,
		notifiesMembers: published,
		...(published ? { coverOffers } : {}),
		...(leave ? { leave } : {}),
	};
};
