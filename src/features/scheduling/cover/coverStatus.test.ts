import { describe, expect, it } from "vitest";
import { coverOptionsFixture } from "@/features/scheduling/cover/fixtures";
import { coverPanelStatus } from "@/features/scheduling/cover/coverStatus";
import type { EngineRepairState } from "@/features/scheduling/cover/useEngineRepair";

const answered = { isPending: false, error: null };
const noneShort = coverOptionsFixture({
	gap: { ...coverOptionsFixture().gap, shortBy: 0, shortSinceGeneration: 0 },
});
const engineReady = (
	shortNow: Extract<EngineRepairState, { status: "ready" }>["shortNow"]
): EngineRepairState => ({
	status: "ready",
	options: [],
	notAssigned: null,
	revision: 1,
	search: { complete: true, optionsFound: 0 },
	shortNow,
	asking: false,
	refusal: undefined,
});

describe("coverPanelStatus", () => {
	it("leaves the gap open while the engine works, even when the list counts nobody short", () => {
		expect(
			coverPanelStatus(answered, noneShort, { status: "loading" })
		).not.toBe("closed");
	});

	it("takes whether the gap is closed from the engine's shortNow once it answered", () => {
		const short = [
			{ start: "2026-10-17T09:00:00", end: "2026-10-17T15:00:00", shortBy: 1 },
		];
		expect(coverPanelStatus(answered, noneShort, engineReady(short))).not.toBe(
			"closed"
		);
		expect(
			coverPanelStatus(answered, coverOptionsFixture(), engineReady([]))
		).toBe("closed");
	});

	it("takes it from the list's count under a refusal, or when the engine could not say", () => {
		const refused: EngineRepairState = {
			status: "refused",
			refusal: "failed",
			retrying: false,
		};
		expect(coverPanelStatus(answered, noneShort, refused)).toBe("closed");
		expect(coverPanelStatus(answered, noneShort, engineReady(null))).toBe(
			"closed"
		);
		expect(
			coverPanelStatus(answered, coverOptionsFixture(), engineReady(null))
		).toBe("options");
	});
});
