import { describe, expect, it } from "vitest";
import {
	draftProblemKey,
	frozenNoticeKey,
} from "@/features/scheduling/schedules/draftNotices";

describe("draftProblemKey", () => {
	it.each([
		["error", "scheduling.draft.failed"],
		["hidden", "scheduling.draft.missing"],
		["missing", "scheduling.draft.missing"],
		["pending", "scheduling.draft.loading"],
		["ready", "scheduling.draft.loading"],
	] as const)("given_%s_when_explained_then_%s", (status, key) => {
		expect(draftProblemKey(status)).toBe(key);
	});
});

describe("frozenNoticeKey", () => {
	it.each([
		["GENERATION_REQUESTED", "scheduling.draft.generationRequested"],
		["GENERATION_FAILED", "scheduling.draft.generationFailed"],
		["GENERATED", "scheduling.draft.generated"],
		["PUBLISHED", "scheduling.draft.generated"],
		["REJECTED", "scheduling.draft.generated"],
		["UNKNOWN", "scheduling.draft.generated"],
	] as const)("given_%s_when_noticed_then_%s", (status, key) => {
		expect(frozenNoticeKey(status)).toBe(key);
	});
});
