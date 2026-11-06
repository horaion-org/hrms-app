import { setupDiagnostics } from "@/features/scheduling/roster/findings/diagnostics";
import type { GenerationFindings } from "@/features/scheduling/schedules/api";

/** How many roster notes and setup issues the engine left. */
export type FindingCounts = { roster: number; setup: number };

const messageCount = (
	entries: ReadonlyArray<{ messages: ReadonlyArray<string> }>
): number => entries.reduce((total, entry) => total + entry.messages.length, 0);

/**
 * Each conflict, each error message, each day's message and each diagnostic
 * about the roster is one roster note; every other diagnostic is one setup
 * issue.
 */
export const findingCounts = (findings: GenerationFindings): FindingCounts => {
	const setup = setupDiagnostics(findings.diagnostics).length;
	return {
		roster:
			findings.conflicts.length +
			messageCount(findings.errors) +
			messageCount(findings.assignmentMessages) +
			(findings.diagnostics.length - setup),
		setup,
	};
};

/** Whether the engine left anything at all. */
export const hasFindings = ({ roster, setup }: FindingCounts): boolean =>
	roster + setup > 0;
