import type { TFunction } from "i18next";
import { isOneOf } from "@/common/isOneOf";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	humaniseIdentifier,
	ruleLabel,
} from "@/features/scheduling/roster/findings/ruleLabel";
import type { FindingsDiagnostic } from "@/features/scheduling/schedules/api";

/*
 * The engine's diagnostics in the app's words. The first four codes are those
 * of the engine's `scheduling_core/diagnostics/checks.py`; the next two are
 * its findings about the days before a schedule, for a rule about day types;
 * the next says when someone may first start after rest carried in from
 * before; the last says days of a days-off block before the schedule were not
 * sent, which is information only.
 * The set is open, so a code added later reads by its code and the engine's
 * own sentence.
 */

export const KNOWN_DIAGNOSTIC_CODES = [
	"UNCOVERABLE_DEMAND",
	"RULE_REFERENCES_MISSING_ENTITY",
	"UNASSIGNABLE_EMPLOYEE",
	"DEAD_SHIFT",
	"PRIOR_RUN_NEEDS_DAY_TYPE",
	"PRIOR_DAYS_UNKNOWN",
	"PRIOR_REST_BLOCKS_SHIFTS",
	"OFF_BLOCK_HISTORY_MISSING",
] as const;

type KnownDiagnosticCode = (typeof KNOWN_DIAGNOSTIC_CODES)[number];

const isKnownCode = (code: string): code is KnownDiagnosticCode =>
	isOneOf(KNOWN_DIAGNOSTIC_CODES, code);

const key = "scheduling.findings.codes";

/** One code's diagnostics, in the order the engine reported them. */
export type DiagnosticGroup = {
	code: string;
	diagnostics: Array<FindingsDiagnostic>;
};

/** The diagnostics grouped by code, each group where its code first appears. */
export const groupDiagnostics = (
	diagnostics: ReadonlyArray<FindingsDiagnostic>
): Array<DiagnosticGroup> => {
	const groups = new Map<string, DiagnosticGroup>();
	for (const diagnostic of diagnostics) {
		const group = groups.get(diagnostic.code) ?? {
			code: diagnostic.code,
			diagnostics: [],
		};
		group.diagnostics.push(diagnostic);
		groups.set(diagnostic.code, group);
	}
	return [...groups.values()];
};

/** A code's heading: the app's label, or the code made readable. */
export const diagnosticLabel = (code: string, t: TFunction): string =>
	isKnownCode(code) ? t(`${key}.${code}.label`) : humaniseIdentifier(code);

/** An entity the engine keyed as text, or null when absent or not text. */
const entityText = (
	diagnostic: FindingsDiagnostic,
	entity: string
): string | null => {
	const value = diagnostic.entities[entity];
	return typeof value === "string" ? value : null;
};

/** An entity the engine keyed as a number, or 0 when absent or not a number. */
const entityCount = (
	diagnostic: FindingsDiagnostic,
	entity: string
): number => {
	const value = diagnostic.entities[entity];
	return typeof value === "number" ? value : 0;
};

/** How many characters an ISO date takes at the start of a date-time ("2026-11-23"). */
const ISO_DATE_LENGTH = 10;

/** The clock time of a local ISO date-time, "09:00" from "2026-11-23T09:00"; empty when absent. */
const clockOf = (dateTime: string): string =>
	dateTime.split("T")[1]?.slice(0, 5) ?? "";

/** The name `id` stands for in `names`, or `fallback` when it doesn't resolve. */
const nameOf = (
	names: ReadonlyMap<string, string>,
	id: string | null,
	fallback: string
): string => (id === null ? undefined : names.get(id)) ?? fallback;

/** The day types a finding's rule is about, joined with "or"; null when its rule doesn't resolve. */
const ruleDayTypesOf = (
	diagnostic: FindingsDiagnostic,
	names: FindingNames,
	t: TFunction
): string | null => {
	const ruleId = entityText(diagnostic, "ruleId");
	const codes = ruleId === null ? undefined : names.ruleDayTypes.get(ruleId);
	if (codes === undefined) return null;
	return t("scheduling.constraints.listOr", {
		items: codes.map((code) => dayTypeLabel(code, t)),
	});
};

/**
 * A sentence about one rule's days in a row, led by the rule's name when it
 * resolves: two such rules (a company's 12 and a department's 6) otherwise
 * read alike, or as one said twice.
 */
const underItsRule = (
	diagnostic: FindingsDiagnostic,
	names: FindingNames,
	t: TFunction,
	sentence: string
): string => {
	const ruleId = entityText(diagnostic, "ruleId");
	const rule = ruleId === null ? undefined : names.rules.get(ruleId);
	return rule === undefined
		? sentence
		: t("scheduling.findings.underRule", { rule, sentence });
};

/**
 * The app's sentence for a known code, naming what it is about; null for a
 * code the app doesn't know, which is then shown in the engine's words only.
 * `day` writes a date the way the findings list does.
 */
export const diagnosticSentence = (
	diagnostic: FindingsDiagnostic,
	names: FindingNames,
	t: TFunction,
	day: (isoDate: string) => string
): string | null => {
	const { code } = diagnostic;
	if (!isKnownCode(code)) return null;
	const member = (): string =>
		nameOf(
			names.members,
			entityText(diagnostic, "employeeId"),
			t("scheduling.findings.unknownMember")
		);
	switch (code) {
		case "UNCOVERABLE_DEMAND":
			return t(`${key}.${code}.sentence`, {
				jobTitle: nameOf(
					names.jobTitles,
					entityText(diagnostic, "roleId"),
					t("scheduling.findings.unknownJobTitle")
				),
			});
		case "RULE_REFERENCES_MISSING_ENTITY": {
			const rule = entityText(diagnostic, "rule");
			const missing = diagnostic.entities["missing"];
			return t(`${key}.${code}.sentence`, {
				rule:
					rule === null
						? t("scheduling.findings.unknownRule")
						: ruleLabel({ name: rule, constraintId: null }, names.rules, t),
				count: Array.isArray(missing) ? missing.length : 0,
			});
		}
		case "UNASSIGNABLE_EMPLOYEE":
			return t(`${key}.${code}.sentence`, { member: member() });
		case "DEAD_SHIFT":
			return t(`${key}.${code}.sentence`, {
				shift: nameOf(
					names.shifts,
					entityText(diagnostic, "shiftId"),
					t("scheduling.findings.unknownShift")
				),
			});
		case "PRIOR_RUN_NEEDS_DAY_TYPE": {
			const neededBy = entityText(diagnostic, "dayTypeNeededBy");
			const dayTypes = ruleDayTypesOf(diagnostic, names, t);
			const run = {
				member: member(),
				count: entityCount(diagnostic, "daysWithoutDayTypesBefore"),
				date: neededBy === null ? "" : day(neededBy),
			};
			// A rule that doesn't resolve has no day types to name, so its sentence names none.
			return dayTypes === null
				? t(`${key}.${code}.sentenceWithoutDayTypes`, run)
				: underItsRule(
						diagnostic,
						names,
						t,
						t(`${key}.${code}.sentence`, { ...run, dayTypes })
					);
		}
		case "PRIOR_REST_BLOCKS_SHIFTS": {
			// Local date-times as the engine keys them, "2026-11-23T09:00".
			const restedAt = entityText(diagnostic, "restedAt") ?? "";
			const previousEnd = entityText(diagnostic, "previousShiftEnd") ?? "";
			return t(`${key}.${code}.sentence`, {
				member: member(),
				time: clockOf(restedAt),
				day: restedAt ? day(restedAt.slice(0, ISO_DATE_LENGTH)) : "",
				endDay: previousEnd ? day(previousEnd.slice(0, ISO_DATE_LENGTH)) : "",
				endTime: clockOf(previousEnd),
			});
		}
		case "OFF_BLOCK_HISTORY_MISSING":
			// Without a member it is about everyone the rule counts.
			if (entityText(diagnostic, "employeeId") === null)
				return t(`${key}.${code}.wholeSchedule`);
			return t(`${key}.${code}.sentence`, { member: member() });
		case "PRIOR_DAYS_UNKNOWN":
			// Without a member it is about the whole schedule: no day before it is known.
			if (entityText(diagnostic, "employeeId") === null)
				return underItsRule(
					diagnostic,
					names,
					t,
					t(`${key}.${code}.wholeSchedule`)
				);
			return underItsRule(
				diagnostic,
				names,
				t,
				t(`${key}.${code}.sentence`, {
					member: member(),
					count: entityCount(diagnostic, "knownDays"),
					lookBack: entityCount(diagnostic, "lookBackDays"),
				})
			);
	}
};

/** Who or what a diagnostic is about, and the day when it names one: the first line of its Issues row. */
export type DiagnosticSubject = {
	/** The member's name, else the shift's or job title's, else the kind of note in plain words. */
	who: string;
	/** The member it is about, when it names one. */
	memberProfileId: string | null;
	/** The ISO day it is about, when it names one. */
	day: string | null;
};

/** The ISO day a diagnostic is about: when rest lets someone start, or when a run needs a day type. */
const dayOfDiagnostic = (diagnostic: FindingsDiagnostic): string | null =>
	(
		entityText(diagnostic, "restedAt") ??
		entityText(diagnostic, "dayTypeNeededBy")
	)?.slice(0, ISO_DATE_LENGTH) ?? null;

/**
 * Who or what a diagnostic is about: the member it names, else its shift,
 * else its job title, else its kind ("Rest carried in from before"). A name
 * that does not resolve falls back to the kind, never to an id. Pure.
 */
export const diagnosticSubject = (
	diagnostic: FindingsDiagnostic,
	names: FindingNames | null,
	t: TFunction
): DiagnosticSubject => {
	const memberProfileId = entityText(diagnostic, "employeeId");
	const shiftId = entityText(diagnostic, "shiftId");
	const roleId = entityText(diagnostic, "roleId");
	const nameIn = (
		lookup: ReadonlyMap<string, string> | undefined,
		id: string | null
	): string | undefined => (id === null ? undefined : lookup?.get(id));
	const who =
		nameIn(names?.members, memberProfileId) ??
		nameIn(names?.shifts, shiftId) ??
		nameIn(names?.jobTitles, roleId) ??
		diagnosticLabel(diagnostic.code, t);
	return { who, memberProfileId, day: dayOfDiagnostic(diagnostic) };
};
