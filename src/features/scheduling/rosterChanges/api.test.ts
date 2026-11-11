import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	applyRosterChange,
	fetchLatestRosterChange,
	previewRosterChange,
	previewRosterUndo,
	undoRosterChange,
	type RosterChangeBody,
} from "@/features/scheduling/rosterChanges/api";
import {
	rosterChangeFixture,
	rosterChangePreviewFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const CHANGES =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/roster-changes";
const BODY: RosterChangeBody = {
	expectedRevision: 1,
	cells: [{ membershipId: "m-1", day: "2026-10-12", kind: "OFF" }],
};

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

describe("roster changes client", () => {
	it("previews a change by posting its cells and revision, and reads a code it doesn't know as UNKNOWN", async () => {
		const preview = rosterChangePreviewFixture({
			checks: [rosterCheckFixture({ code: "SOMETHING_NEW" as never })],
		});
		const calls = stubApi({
			[`POST ${CHANGES}/preview`]: { status: 200, body: envelope(preview) },
		});

		const parsed = await previewRosterChange("c-1", UNIT, "s-1", BODY);

		expect(calls[0]?.body).toEqual(BODY);
		expect(parsed.checks[0]?.code).toBe("UNKNOWN");
		expect(parsed.ruleCheck).toBe("NOT_CHECKED");
	});

	it("reads an absent cell, a cell's day type and a check's day type, and a kind it doesn't know as OFF", async () => {
		const [cell] = rosterChangePreviewFixture().cells;
		stubApi({
			[`POST ${CHANGES}/preview`]: {
				status: 200,
				body: envelope(
					rosterChangePreviewFixture({
						cells: [
							{
								...cell!,
								before: {
									kind: "ABSENT",
									dayType: null,
									shift: null,
									jobTitle: null,
								},
								after: {
									kind: "SOMETHING_NEW" as never,
									dayType: "REST",
									shift: null,
									jobTitle: null,
								},
							},
						],
						checks: [
							rosterCheckFixture({
								code: "WORKS_ON_DAY_OFF",
								dayType: "PUBLIC_HOLIDAY_OFF",
							}),
						],
					})
				),
			},
		});

		const parsed = await previewRosterChange("c-1", UNIT, "s-1", BODY);

		expect(parsed.cells[0]?.before).toMatchObject({
			kind: "ABSENT",
			dayType: null,
		});
		expect(parsed.cells[0]?.after).toMatchObject({
			kind: "OFF",
			dayType: "REST",
		});
		expect(parsed.checks[0]?.dayType).toBe("PUBLIC_HOLIDAY_OFF");
	});

	it("reads a cell and a check without a day type, from an older API, as null", async () => {
		const [cell] = rosterChangePreviewFixture().cells;
		stubApi({
			[`POST ${CHANGES}/preview`]: {
				status: 200,
				body: envelope(
					rosterChangePreviewFixture({
						// undefined leaves the key out of the JSON.
						cells: [
							{
								...cell!,
								after: { ...cell!.after, dayType: undefined as never },
							},
						],
						checks: [rosterCheckFixture({ dayType: undefined as never })],
					})
				),
			},
		});

		const parsed = await previewRosterChange("c-1", UNIT, "s-1", BODY);

		expect(parsed.cells[0]?.after.dayType).toBeNull();
		expect(parsed.checks[0]?.dayType).toBeNull();
	});

	it("applies a change and undoes it by the revision it produced", async () => {
		const change = rosterChangeFixture();
		const calls = stubApi({
			[`POST ${CHANGES}`]: { status: 201, body: envelope(change) },
			[`POST ${CHANGES}/rc-1/undo`]: {
				status: 201,
				body: envelope(rosterChangeFixture({ kind: "UNDO", undoable: false })),
			},
		});

		expect(
			await applyRosterChange("c-1", UNIT, "s-1", { ...BODY, remark: "Asked" })
		).toEqual(change);
		const undone = await undoRosterChange("c-1", UNIT, "s-1", "rc-1", {
			expectedRevision: 2,
		});

		expect(undone.kind).toBe("UNDO");
		expect(calls.map((call) => call.body)).toEqual([
			{ ...BODY, remark: "Asked" },
			{ expectedRevision: 2 },
		]);
	});

	it("previews an undo by the revision the edit produced", async () => {
		const calls = stubApi({
			[`POST ${CHANGES}/rc-1/undo/preview`]: {
				status: 200,
				body: envelope(rosterChangePreviewFixture({ expectedRevision: 2 })),
			},
		});

		const preview = await previewRosterUndo("c-1", UNIT, "s-1", "rc-1", 2);

		expect(preview.expectedRevision).toBe(2);
		expect(calls[0]?.body).toEqual({ expectedRevision: 2 });
	});

	it("reads no latest change, for a roster as generated, as null", async () => {
		stubApi({
			[`GET ${CHANGES}/latest`]: {
				status: 200,
				body: envelope({ change: null }),
			},
		});

		expect(await fetchLatestRosterChange("c-1", UNIT, "s-1")).toBeNull();
	});
});
