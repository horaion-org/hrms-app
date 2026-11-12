import type { TFunction } from "i18next";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	humaniseIdentifier,
	ruleLabel,
} from "@/features/scheduling/roster/findings/ruleLabel";
import type { FindingsDiagnostic } from "@/features/scheduling/schedules/api";

/*
 * The engine's diagnostics in the app's words. The first four codes are those
 * of the engine's `scheduling_core/diagnostics/checks.py`; the last two are
 * its findings about the days before a schedule, for a rule about day types.
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
] as const;

type KnownDiagnosticCode = (typeof KNOWN_DIAGNOSTIC_CODES)[number];

const isKnownCode = (code: string): code is KnownDiagnosticCode =>
	(KNOWN_DIAGNOSTIC_CODES as ReadonlyArray<string>).includes(code);

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
				: t(`${key}.${code}.sentence`, { ...run, dayTypes });
		}
		case "PRIOR_DAYS_UNKNOWN":
			// Without a member it is about the whole schedule: no day before it is known.
			if (entityText(diagnostic, "employeeId") === null)
				return t(`${key}.${code}.wholeSchedule`);
			return t(`${key}.${code}.sentence`, {
				member: member(),
				count: entityCount(diagnostic, "knownDays"),
				lookBack: entityCount(diagnostic, "lookBackDays"),
			});
	}
};
