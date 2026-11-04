import type { TFunction } from "i18next";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	humaniseIdentifier,
	ruleLabel,
} from "@/features/scheduling/roster/findings/ruleLabel";
import type { FindingsDiagnostic } from "@/features/scheduling/schedules/api";

/*
 * The engine's diagnostics in the app's words. The four codes are those of the
 * engine's `scheduling_core/diagnostics/checks.py`; the set is open, so a code
 * added later reads by its code and the engine's own sentence.
 */

export const KNOWN_DIAGNOSTIC_CODES = [
	"UNCOVERABLE_DEMAND",
	"RULE_REFERENCES_MISSING_ENTITY",
	"UNASSIGNABLE_EMPLOYEE",
	"DEAD_SHIFT",
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

/** The name `id` stands for in `names`, or `fallback` when it doesn't resolve. */
const nameOf = (
	names: ReadonlyMap<string, string>,
	id: string | null,
	fallback: string
): string => (id === null ? undefined : names.get(id)) ?? fallback;

/**
 * The app's sentence for a known code, naming what it is about; null for a
 * code the app doesn't know, which is then shown in the engine's words only.
 */
export const diagnosticSentence = (
	diagnostic: FindingsDiagnostic,
	names: FindingNames,
	t: TFunction
): string | null => {
	const { code } = diagnostic;
	if (!isKnownCode(code)) return null;
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
			return t(`${key}.${code}.sentence`, {
				member: nameOf(
					names.members,
					entityText(diagnostic, "employeeId"),
					t("scheduling.findings.unknownMember")
				),
			});
		case "DEAD_SHIFT":
			return t(`${key}.${code}.sentence`, {
				shift: nameOf(
					names.shifts,
					entityText(diagnostic, "shiftId"),
					t("scheduling.findings.unknownShift")
				),
			});
	}
};
