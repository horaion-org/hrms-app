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
import { rosterCellKey } from "@/features/scheduling/rosterChanges/rosterEdit";
import {
	useRosterChangeActions,
	type RosterChangeTarget,
} from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import type { RosterEditing } from "./rosterEditing";

/** A target that changes nothing: the viewer may not change this roster. */
const NO_TARGET: RosterChangeTarget = {
	companyId: "",
	unit: { branchId: "", departmentId: "" },
	scheduleId: "",
	runId: null,
};

/** The retypes asked for at once, and the key of the item or group they were pressed on. */
type FixRequest = { key: string; retypes: ReadonlyArray<DayTypeRetype> };

export type DayTypeFixesInput = {
	/** Every Issues item (`issuesOfRoster`). */
	issues: ReadonlyArray<RosterIssue>;
	constraints: DayTypeFixSources["constraints"];
	assignments: ReadonlyArray<ScheduleAssignment>;
	/** What changing the roster needs; no fixes are offered without. */
	editing: RosterEditing | undefined;
	/** A fix landed: the roster says so in its toast with Undo. */
	onApplied: (change: RosterChange) => void;
	/** Opens a day's editor, by its `rosterCellKey`. */
	onOpenCell: (cell: string) => void;
};

export type DayTypeFixes = {
	/** The fixes the Issues list offers; undefined for someone who may not change the roster. */
	fixes: IssueFixes | undefined;
	/** The day type the editor of `cell` opens with, when a fix opened it. */
	presetDayTypeOf: (cell: string | undefined) => string | undefined;
	/** Forgets the day a fix opened, once its editor closes. */
	forgetPreset: () => void;
};

/**
 * The fixes Issues offers for weekly day-type rules (`dayTypeFix`), and how
 * each is made. On a roster not published, a fix is a hand change like any
 * other: previewed, then applied at the roster's revision through
 * `useRosterChangeActions`, so the toast with Undo and the next validation
 * follow by themselves. Every day of a "fix them all" goes in one change,
 * so one Undo takes them all back; days a check holds (a refusal, a tick or
 * a remark asked for) are left out and counted. A single day a check holds,
 * and every fix on a published roster, opens the day's editor with not
 * working and the day type already chosen instead.
 */
export const useDayTypeFixes = ({
	issues,
	constraints,
	assignments,
	editing,
	onApplied,
	onOpenCell,
}: DayTypeFixesInput): DayTypeFixes => {
	const client = useQueryClient();
	const target = editing?.target ?? NO_TARGET;
	const { apply } = useRosterChangeActions(target);
	const [busy, setBusy] = useState(false);
	const [outcome, setOutcome] = useState<IssueFixOutcome>();
	const [preset, setPreset] = useState<{ cell: string; dayType: string }>();

	const presetDayTypeOf: DayTypeFixes["presetDayTypeOf"] = (cell) =>
		preset !== undefined && preset.cell === cell ? preset.dayType : undefined;
	const forgetPreset = (): void => {
		setPreset(undefined);
	};
	if (!editing) return { fixes: undefined, presetDayTypeOf, forgetPreset };

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

	/** Opens the day's editor with the retype chosen, for the manager to finish there. */
	const openInEditor = (retype: DayTypeRetype): void => {
		const cell = rosterCellKey(retype.membershipId, retype.day);
		setPreset({ cell, dayType: retype.to });
		onOpenCell(cell);
	};

	/** Previews the retypes, leaves out the days a check holds, and applies the rest as one change. */
	const change = async ({ key, retypes }: FixRequest): Promise<void> => {
		const asked = retypeCells(retypes);
		const first = await preview(asked);
		const free = cellsNotHeld(asked, first.checks);
		const [only] = retypes;
		if (free.length === 0 && only !== undefined && retypes.length === 1) {
			openInEditor(only);
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
		presetDayTypeOf,
		forgetPreset,
		fixes: {
			retypes: dayTypeRetypes(issues, {
				constraints,
				assignments,
				nonWorkingDayTypes: editing.nonWorkingDayTypes,
			}),
			busy,
			outcome,
			onFix: (retype): void => {
				if (published) openInEditor(retype);
				else run({ key: retype.issueKey, retypes: [retype] });
			},
			onFixAll: published
				? undefined
				: (group): void => {
						run(group);
					},
		},
	};
};
