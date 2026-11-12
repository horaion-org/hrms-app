import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";

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
