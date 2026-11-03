import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { WindowDraft } from "@/features/availability/availabilityModel";
import { availabilityRefusal } from "@/features/availability/availabilityRefusal";

const t = authTestI18n.t;

const problem = (
	status: number,
	errorCode: string,
	fieldErrors: Array<{ field: string; message: string }> = []
): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors,
		reason: "http",
	});

const rows: Array<WindowDraft> = [
	{ days: ["MON", "TUE"], startTime: "09:00", endTime: "13:00" },
	{ days: ["TUE"], startTime: "12:00", endTime: "17:00" },
];

describe("availabilityRefusal", () => {
	it("given_invalidEntries_when_mapped_then_marksTheRowEachWasSentFromWithOneMessageEach", () => {
		const refusal = availabilityRefusal(
			problem(400, "INVALID_WEEKLY_AVAILABILITY", [
				{ field: "windows[2]", message: "The window overlaps windows[1]" },
				{ field: "windows[0].endTime", message: "Off the grid" },
			]),
			rows,
			t
		);

		expect(refusal.fields).toEqual({
			"rows.1":
				"This window was refused. Check that it doesn’t overlap another or crowd its day.",
			"rows.0":
				"This window was refused. Check that it doesn’t overlap another or crowd its day.",
		});
		expect(refusal.message).toBe(
			"Some windows were refused. Check the windows marked below."
		);
	});

	it("given_aMemberNoLongerPartTime_when_mapped_then_explainsItAsTheAlert", () => {
		expect(
			availabilityRefusal(
				problem(409, "AVAILABILITY_REQUIRES_PART_TIME"),
				rows,
				t
			)
		).toEqual({
			fields: {},
			message:
				"Only part-time members can have availability, and this person isn’t part-time any more. Reload the page.",
			refreshMembers: false,
		});
	});

	it("given_aWeekAlreadyOver_when_mapped_then_explainsItAsTheAlert", () => {
		expect(
			availabilityRefusal(problem(400, "AVAILABILITY_WEEK_IN_PAST"), rows, t)
		).toEqual({
			fields: {},
			message:
				"This week has already ended, so its availability can’t be changed. Choose this week or a later one.",
			refreshMembers: false,
		});
	});

	it("given_aMissingPermission_when_mapped_then_saysTheyMayNoLongerChangeIt", () => {
		expect(
			availabilityRefusal(problem(403, "ACCESS_DENIED"), rows, t).message
		).toBe(
			"You no longer have permission to change this person’s availability."
		);
	});

	it("given_anythingElse_when_mapped_then_saysItCouldNotBeSaved", () => {
		expect(availabilityRefusal(new Error("offline"), rows, t).message).toBe(
			"We couldn’t save the availability. Try again."
		);
	});
});
