import {
	messageFindings,
	type Finding,
} from "@/features/scheduling/roster/findings/finding";
import type {
	FindingsConflict,
	GenerationFindings,
} from "@/features/scheduling/schedules/api";

/** One day's notes: its conflicts by start time, then its errors. */
export type DateRosterNotes = { date: string; findings: Array<Finding> };

/** One member's notes, or the notes that name neither a member nor a day. */
export type MemberRosterNotes = {
	/** The engine's employee id, or null for a note that names no one. */
	memberProfileId: string | null;
	findings: Array<Finding>;
};

export type RosterNotes = {
	byDate: Array<DateRosterNotes>;
	byMember: Array<MemberRosterNotes>;
};

/** A note with a day is shown only on the days in view; one without a day always is. */
export const isOnShownDays = (
	date: string | null,
	shownDays: ReadonlySet<string>
): boolean => date === null || shownDays.has(date);

const conflictNote = (conflict: FindingsConflict): Finding => ({
	kind: "conflict",
	conflict,
});

/** The day's conflicts by start time, then its other notes as they came. */
const dateNotes = (
	date: string,
	conflicts: ReadonlyArray<FindingsConflict>,
	messages: ReadonlyArray<Finding>
): DateRosterNotes => ({
	date,
	findings: [
		...[...conflicts]
			.sort((first, second) => first.start.localeCompare(second.start))
			.map(conflictNote),
		...messages,
	],
});

/**
 * The roster notes on the days in view: each day's own notes by date, and
 * the notes about one member (their conflicts, their errors and their days'
 * messages) by member, each member where they first appear in that order.
 */
export const rosterNotes = (
	{ conflicts, errors, assignmentMessages }: GenerationFindings,
	visibleDays: ReadonlyArray<string>
): RosterNotes => {
	const shownDays = new Set(visibleDays);
	const dayConflicts = new Map<string, Array<FindingsConflict>>();
	const dayMessages = new Map<string, Array<Finding>>();
	const members = new Map<string | null, MemberRosterNotes>();
	const addForMember = (
		memberProfileId: string | null,
		findings: ReadonlyArray<Finding>
	): void => {
		const notes = members.get(memberProfileId) ?? {
			memberProfileId,
			findings: [],
		};
		notes.findings.push(...findings);
		members.set(memberProfileId, notes);
	};

	for (const conflict of conflicts) {
		if (!isOnShownDays(conflict.date, shownDays)) continue;
		if (conflict.employeeUuid !== null)
			addForMember(conflict.employeeUuid, [conflictNote(conflict)]);
		else
			dayConflicts.set(conflict.date, [
				...(dayConflicts.get(conflict.date) ?? []),
				conflict,
			]);
	}
	for (const { employeeId, date, messages } of errors) {
		if (!isOnShownDays(date, shownDays)) continue;
		if (employeeId === null && date !== null)
			dayMessages.set(date, [
				...(dayMessages.get(date) ?? []),
				...messageFindings(date, messages),
			]);
		else addForMember(employeeId, messageFindings(date, messages));
	}
	for (const { employeeId, day, messages } of assignmentMessages) {
		if (isOnShownDays(day, shownDays))
			addForMember(employeeId, messageFindings(day, messages));
	}

	const dates = [...new Set([...dayConflicts.keys(), ...dayMessages.keys()])];
	return {
		byDate: dates
			.sort()
			.map((date) =>
				dateNotes(
					date,
					dayConflicts.get(date) ?? [],
					dayMessages.get(date) ?? []
				)
			),
		byMember: [...members.values()],
	};
};
