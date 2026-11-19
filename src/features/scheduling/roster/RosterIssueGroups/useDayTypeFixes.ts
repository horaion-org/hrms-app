import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	cellsNotHeld,
	dayTypeRetypes,
	retypeCells,
	type DayTypeFixSources,
	type DayTypeRetype,
	type IssueFixOutcome,
	type IssueFixes,
} from "@/features/scheduling/roster/dayTypeFix";
import type { RosterIssue } from "@/features/scheduling/roster/rosterIssueGroups";
import {
	rosterChangePreviewQuery,
	type RosterChange,
	type RosterChangeCell,
	type RosterChangePreview,
} from "@/features/scheduling/rosterChanges/api";
import { rosterChangeRefusal } from "@/features/scheduling/rosterChanges/rosterChangeRefusal";
import {
	useRosterChangeActions,
	type RosterChangeTarget,
} from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/** The retypes asked for at once, and the key of the item or group they were pressed on. */
type FixRequest = { key: string; retypes: ReadonlyArray<DayTypeRetype> };

/** What a fix needs of the roster's editing (`RosterEditing`): where changes go, at which revision, and how. */
export type IssueFixEditing = {
	target: RosterChangeTarget;
	/** The roster revision on screen. */
	revision: number;
	/** The schedule's types for a day not worked, as codes. */
	nonWorkingDayTypes: ReadonlyArray<string>;
	/** The roster is published: a change tells the people whose days it changes, so it is made in the day's editor. */
	notifiesMembers: boolean;
};

export type DayTypeFixesInput = {
	/** Every Issues item (`issuesOfRoster`). */
	issues: ReadonlyArray<RosterIssue>;
	constraints: DayTypeFixSources["constraints"];
	assignments: ReadonlyArray<ScheduleAssignment>;
	/** What changing the roster needs. */
	editing: IssueFixEditing;
	/** A fix landed: the roster says so in its toast with Undo. */
	onApplied: (change: RosterChange) => void;
	/** Opens the day's editor with not working and the retype's day type chosen. */
	onOpenDay: (retype: DayTypeRetype) => void;
};

/** What making a fix from Issues needs, besides the items listed: the roster, its frozen rules and how to change it. */
export type IssueFixing = Omit<DayTypeFixesInput, "issues">;

/**
 * The fixes Issues offers for weekly day-type rules (`dayTypeFix`), and how
 * each is made. On a roster not published, a fix is a hand change like any
 * other: previewed, then applied at the roster's revision through
 * `useRosterChangeActions`, so the toast with Undo and the next validation
 * follow by themselves. Every day of a "fix them all" goes in one change,
 * so one Undo takes them all back; days a check holds (a refusal, a tick or
 * a remark asked for) are left out and counted. A single day a check holds,
 * and every fix on a published roster, opens the day's editor with not
 * working and the day type already chosen instead. Only for someone who may
 * change the roster: it needs the query client the editor uses.
 */
export const useDayTypeFixes = ({
	issues,
	constraints,
	assignments,
	editing,
	onApplied,
	onOpenDay,
}: DayTypeFixesInput): IssueFixes => {
	const client = useQueryClient();
	const { target } = editing;
	const { apply } = useRosterChangeActions(target);
	const [busy, setBusy] = useState(false);
	const [outcome, setOutcome] = useState<IssueFixOutcome>();

	const preview = (
		cells: Array<RosterChangeCell>
	): Promise<RosterChangePreview> =>
		client.fetchQuery(
			rosterChangePreviewQuery(
				target.companyId,
				target.unit,
				target.scheduleId,
				{
					expectedRevision: editing.revision,
					cells,
				}
			)
		);

	/** Previews the retypes, leaves out the days a check holds, and applies the rest as one change. */
	const change = async ({ key, retypes }: FixRequest): Promise<void> => {
		const asked = retypeCells(retypes);
		const first = await preview(asked);
		const free = cellsNotHeld(asked, first.checks);
		const [only] = retypes;
		if (free.length === 0 && only !== undefined && retypes.length === 1) {
			onOpenDay(only);
			return;
		}
		if (free.length > 0) {
			// Fewer cells than asked: their checks and fingerprint are read again.
			const checked =
				free.length === asked.length ? first : await preview(free);
			if (cellsNotHeld(free, checked.checks).length < free.length) {
				setOutcome({ key, refusal: "refused" });
				return;
			}
			onApplied(
				await apply.mutateAsync({
					expectedRevision: editing.revision,
					cells: free,
					checksFingerprint: checked.checksFingerprint ?? undefined,
				})
			);
		}
		if (free.length < asked.length)
			setOutcome({ key, done: free.length, total: asked.length });
	};

	/** Makes the change, one at a time, and keeps why it was refused. */
	const run = (request: FixRequest): void => {
		setBusy(true);
		setOutcome(undefined);
		change(request)
			.catch((error: unknown) => {
				setOutcome({ key: request.key, refusal: rosterChangeRefusal(error) });
			})
			.finally(() => {
				setBusy(false);
			});
	};

	const published = editing.notifiesMembers;
	return {
		retypes: dayTypeRetypes(issues, {
			constraints,
			assignments,
			nonWorkingDayTypes: editing.nonWorkingDayTypes,
		}),
		busy,
		outcome,
		onFix: (retype): void => {
			if (published) onOpenDay(retype);
			else run({ key: retype.issueKey, retypes: [retype] });
		},
		onFixAll: published
			? undefined
			: (group): void => {
					run(group);
				},
	};
};
