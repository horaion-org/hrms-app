import type { IssueCoverContext } from "@/features/scheduling/roster/IssuesPanel";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import type { RosterChange } from "@/features/scheduling/rosterChanges/api";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import type { RosterEditing } from "./rosterEditing";

/** What covering a short shift from its Issues row is made from. */
type IssueCoverSources = {
	editing: RosterEditing;
	timeZone: string;
	assignments: ReadonlyArray<ScheduleAssignment>;
	validation: RosterValidation | undefined;
	view: RosterSearch;
	onViewChange: (view: RosterSearch) => void;
	onPreviewDays: IssueCoverContext["onPreviewDays"];
	/** A change landed: the toast says it, with what it leaves short. */
	onLanded: (applied: { change: RosterChange; stillShort?: string }) => void;
};

/**
 * Covering a short shift from its Issues row, applied as a hand change, the
 * list staying open: after a change lands, and after a recorded yes, the
 * roster is checked again once it shows the change, so the rows follow what
 * is left; a filled gap's link (`view.cover`) goes with it.
 */
export const issueCoverOf = ({
	editing,
	timeZone,
	assignments,
	validation,
	view,
	onViewChange,
	onPreviewDays,
	onLanded,
}: IssueCoverSources): IssueCoverContext => ({
	target: editing.target,
	revision: editing.revision,
	assignments,
	shifts: editing.shifts,
	coverOffers: editing.coverOffers && {
		offers: editing.coverOffers.offers,
		timeZone,
	},
	onPreviewDays,
	// After a change the check is asked first: the hours-based list for the new revision waits for its answer.
	listWaitsForCheck: validation?.status === "loading",
	onApplied: (change, { filled, stillShort }): void => {
		onLanded({ change, stillShort });
		validation?.askAt(change.toRevision);
		// A filled gap keeps no row of its own: the list is the new check's; one still short stays open.
		if (filled && view.cover) onViewChange({ ...view, cover: undefined });
	},
	// One Try again brings both back: the row's options, and a rules check that had failed beside them.
	onOptionsBack: (): void => {
		if (validation?.status === "refused") validation.ask();
	},
	// A recorded yes applies one change too.
	onCoverRecorded: (): void => {
		validation?.askAt(editing.revision + 1);
	},
});
