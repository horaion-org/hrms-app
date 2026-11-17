import { describe, expect, it } from "vitest";
import {
	rosterEditingOf,
	type RosterEditingSource,
} from "@/features/scheduling/roster/GeneratedRoster/rosterEditing";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

const TARGET = {
	companyId: "c-1",
	unit: { branchId: "b-1", departmentId: "d-1" },
	scheduleId: "s-1",
	runId: "run-1",
};

const COVER_OFFERS: RosterEditingSource["coverOffers"] = {
	offers: [],
	failed: false,
	retry: (): void => {},
};

/** A generated roster someone may change, without the leave keys. */
const GENERATED: RosterEditingSource = {
	target: TARGET,
	schedule: generatedScheduleFixture({
		status: "GENERATED",
		rosterRevision: 3,
	}),
	shifts: frozenShiftsFixture(),
	coverOffers: COVER_OFFERS,
	leave: undefined,
};

describe("rosterEditingOf", () => {
	it("gives nothing to someone who may not change the roster now", () => {
		expect(
			rosterEditingOf({ ...GENERATED, target: undefined })
		).toBeUndefined();
	});

	it("edits a generated roster quietly, without cover offers or leave", () => {
		expect(rosterEditingOf(GENERATED)).toEqual({
			target: TARGET,
			revision: 3,
			shifts: frozenShiftsFixture(),
			nonWorkingDayTypes: ["OFF", "REST"],
			notifiesMembers: false,
		});
	});

	it("asks first on a published roster, and brings its cover offers", () => {
		const published = generatedScheduleFixture({ status: "PUBLISHED" });

		expect(
			rosterEditingOf({ ...GENERATED, schedule: published })
		).toMatchObject({ notifiesMembers: true, coverOffers: COVER_OFFERS });
	});

	it("offers leave choices to someone who may handle leave here", () => {
		const leave = { viewerMembershipId: "m-1" };

		expect(rosterEditingOf({ ...GENERATED, leave })).toMatchObject({ leave });
	});
});
