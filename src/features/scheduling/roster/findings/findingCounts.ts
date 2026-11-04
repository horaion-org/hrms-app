import type { GenerationFindings } from "@/features/scheduling/schedules/api";

/** How many roster notes and setup issues the engine left. */
export type FindingCounts = { roster: number; setup: number };

const messageCount = (
	entries: ReadonlyArray<{ messages: ReadonlyArray<string> }>
): number => entries.reduce((total, entry) => total + entry.messages.length, 0);

/**
 * Each conflict, each error message and each day's message is one roster
 * note; each diagnostic is one setup issue.
 */
export const findingCounts = (findings: GenerationFindings): FindingCounts => ({
	roster:
		findings.conflicts.length +
		messageCount(findings.errors) +
		messageCount(findings.assignmentMessages),
	setup: findings.diagnostics.length,
});

/** Whether the engine left anything at all. */
export const hasFindings = ({ roster, setup }: FindingCounts): boolean =>
	roster + setup > 0;
