import type { TFunction } from "i18next";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import {
	stretchedTimes,
	stretchMinutes,
	type DayTimes,
} from "@/features/scheduling/roster/shiftStretch";
import type {
	RosterChangeCell,
	RosterChangePreview,
} from "@/features/scheduling/rosterChanges/api";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type {
	RosterCellValue,
	ScheduleAssignment,
} from "@/features/scheduling/schedules/api";

/*
 * A roster change drawn, pure: each day it touches as a before → after pair
 * of the roster's own tiles, a shift in its colour with the times worked (a
 * stretch's "+N h" with them), or a day off in its words.
 */

/** One tile: a shift worked, or a day without one. */
export type ChangeTileFace =
	| {
			kind: "shift";
			name: string;
			/** The frozen shift's "#RRGGBB". */
			colour: string;
			/** The times worked: the shift's, widened by a stretch. */
			times: DayTimes;
			/** The minutes a stretch adds; 0 for none. */
			stretchMinutes: number;
	  }
	| { kind: "day"; label: string };

/** One day of a change: the day, what it holds now, and after. */
export type ChangeTilePair = {
	key: string;
	/** The day changed, as an ISO date. */
	day: string;
	before: ChangeTileFace;
	after: ChangeTileFace;
};

/** A shift as a tile needs it. */
export type TileShift = {
	name: string;
	colour: string;
	startTime: string;
	endTime: string;
};

/** A shift worked as a tile, its times widened by the minutes before and after. */
const shiftFace = (
	shift: TileShift,
	stretch: { beforeMinutes: number; afterMinutes: number } | null
): ChangeTileFace => ({
	kind: "shift",
	name: shift.name,
	colour: shift.colour,
	times: stretchedTimes({ start: shift.startTime, end: shift.endTime }, stretch),
	stretchMinutes: stretchMinutes(stretch),
});

/** A roster day as a tile: its shift (a stretch widening its times), or the day's words ("Day off", "On leave"). */
export const tileFaceOfCell = (
	cell: RosterCellValue,
	t: TFunction
): ChangeTileFace =>
	cell.kind === "WORK" && cell.shift
		? shiftFace(cell.shift, cell.stretch ?? null)
		: { kind: "day", label: rosterCellText(cell, t) };

/** What a change makes of a day, as a tile; a shift nobody can name reads as a day off. */
const tileFaceOfChange = (
	cell: RosterChangeCell,
	shiftOf: (shiftId: string) => TileShift | undefined,
	t: TFunction
): ChangeTileFace => {
	const shift = cell.kind === "WORK" ? shiftOf(cell.shiftId) : undefined;
	if (cell.kind === "WORK" && shift)
		return shiftFace(shift, {
			beforeMinutes: cell.stretchBeforeMinutes ?? 0,
			afterMinutes: cell.stretchAfterMinutes ?? 0,
		});
	const dayType = cell.kind === "OFF" ? cell.dayType : undefined;
	return {
		kind: "day",
		label: dayType
			? dayTypeLabel(dayType, t)
			: t("scheduling.rosterEdit.dayOff"),
	};
};

/** A day nobody is rostered on: off. */
const DAY_OFF = (t: TFunction): ChangeTileFace => ({
	kind: "day",
	label: t("scheduling.rosterEdit.dayOff"),
});

/** A change's cells as pairs, each read against the roster's day as it stands now. */
export const changeTilePairs = (
	cells: ReadonlyArray<RosterChangeCell>,
	assignments: ReadonlyArray<ScheduleAssignment>,
	shiftOf: (shiftId: string) => TileShift | undefined,
	t: TFunction
): Array<ChangeTilePair> =>
	cells.map((cell) => {
		const row = assignments.find(
			(candidate) =>
				candidate.member?.membershipId === cell.membershipId &&
				candidate.day === cell.day
		);
		return {
			key: `${cell.membershipId}|${cell.day}`,
			day: cell.day,
			before: row ? tileFaceOfCell(assignmentCell(row), t) : DAY_OFF(t),
			after: tileFaceOfChange(cell, shiftOf, t),
		};
	});

/** A preview's days as pairs, as the API worked them out. */
export const previewTilePairs = (
	preview: RosterChangePreview,
	t: TFunction
): Array<ChangeTilePair> =>
	preview.cells.map((cell) => ({
		key: `${cell.membershipId ?? ""}|${cell.day}`,
		day: cell.day,
		before: tileFaceOfCell(cell.before, t),
		after: tileFaceOfCell(cell.after, t),
	}));

/** One person's changed days, under their name. */
export type ChangeTileGroup = {
	membershipId: string;
	name: string;
	days: Array<ChangeTilePair>;
};

/** The days of a change grouped by person, in the order each person first appears. */
const groupedByPerson = (
	days: ReadonlyArray<{
		membershipId: string;
		name: string;
		day: ChangeTilePair;
	}>
): Array<ChangeTileGroup> =>
	days.reduce<Array<ChangeTileGroup>>((groups, { membershipId, name, day }) => {
		const group = groups.find(
			(candidate) => candidate.membershipId === membershipId
		);
		if (group) group.days.push(day);
		else groups.push({ membershipId, name, days: [day] });
		return groups;
	}, []);

/**
 * A change's cells as groups, one per person named by `memberName`, each day
 * a before → after pair read against the roster as it stands now.
 */
export const changeTileGroups = (
	cells: ReadonlyArray<RosterChangeCell>,
	assignments: ReadonlyArray<ScheduleAssignment>,
	shiftOf: (shiftId: string) => TileShift | undefined,
	memberName: (membershipId: string) => string,
	t: TFunction
): Array<ChangeTileGroup> => {
	const pairs = changeTilePairs(cells, assignments, shiftOf, t);
	return groupedByPerson(
		cells.map((cell, place) => ({
			membershipId: cell.membershipId,
			name: memberName(cell.membershipId),
			day: pairs[place]!,
		}))
	);
};

/** A preview's days as groups, one per person, as the API worked them out and named them. */
export const previewTileGroups = (
	preview: RosterChangePreview,
	memberName: (membershipId: string) => string,
	t: TFunction
): Array<ChangeTileGroup> => {
	const pairs = previewTilePairs(preview, t);
	return groupedByPerson(
		preview.cells.map((cell, place) => ({
			membershipId: cell.membershipId ?? "",
			name:
				cell.displayName ??
				(cell.membershipId === null ? "" : memberName(cell.membershipId)),
			day: pairs[place]!,
		}))
	);
};
