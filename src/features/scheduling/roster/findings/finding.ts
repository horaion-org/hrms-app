import type {
	FindingsConflict,
	FindingsDiagnostic,
} from "@/features/scheduling/schedules/api";

/*
 * One thing the engine found, as the roster page shows it: in the findings
 * panel and in a grid marker's popover alike. A diagnostic is about the
 * schedule's setup; everything else is about the roster itself.
 */

export type Finding =
	| { kind: "conflict"; conflict: FindingsConflict }
	/** An error or a day's message, in the engine's words, with its day if it names one. */
	| { kind: "message"; date: string | null; message: string }
	| { kind: "diagnostic"; diagnostic: FindingsDiagnostic };

/** One finding per message, each with the day the messages name, if any. */
export const messageFindings = (
	date: string | null,
	messages: ReadonlyArray<string>
): Array<Finding> =>
	messages.map((message) => ({ kind: "message", date, message }));

/** Roster notes are reviewed on the roster; setup issues are fixed in the setup. */
export type FindingFamily = "roster" | "setup";

/** A diagnostic is a setup issue unless the engine says it is about the roster. */
export const findingFamily = (finding: Finding): FindingFamily =>
	finding.kind === "diagnostic" && finding.diagnostic.audience !== "roster"
		? "setup"
		: "roster";

export type FindingTone = "error" | "warning" | "info";

/**
 * Roster notes read as errors. A diagnostic reads by its severity, which the
 * engine always sends as "warning" today; an unknown severity reads as a
 * warning too.
 */
export const findingTone = (finding: Finding): FindingTone => {
	if (finding.kind !== "diagnostic") return "error";
	const severity = finding.diagnostic.severity.toLowerCase();
	if (severity === "error" || severity === "critical") return "error";
	if (severity === "info") return "info";
	return "warning";
};

const TONE_STRENGTH: Record<FindingTone, number> = {
	info: 0,
	warning: 1,
	error: 2,
};

/** The tone of the most serious finding; info when there are none. */
export const strongestTone = (findings: ReadonlyArray<Finding>): FindingTone =>
	findings
		.map(findingTone)
		.reduce<FindingTone>(
			(strongest, tone) =>
				TONE_STRENGTH[tone] > TONE_STRENGTH[strongest] ? tone : strongest,
			"info"
		);
