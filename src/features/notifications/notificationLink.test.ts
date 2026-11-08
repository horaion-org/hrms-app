import { describe, expect, it } from "vitest";
import { notificationLink } from "@/features/notifications/notificationLink";

describe("notificationLink", () => {
	it("opens a leave request on the Leave page, with the beneficiary when known", () => {
		expect(
			notificationLink({ kind: "leave", requestId: "lr-1", memberId: "m-1" })
		).toEqual({
			to: "/leave",
			search: { requestId: "lr-1", memberId: "m-1" },
		});
	});

	it("opens a schedule's roster by its id", () => {
		expect(
			notificationLink({ kind: "schedule", scheduleId: "s-1", day: undefined })
		).toEqual({
			to: "/scheduling/$scheduleId",
			params: { scheduleId: "s-1" },
			search: {},
		});
	});

	it("opens a roster on the week of the day a notification is about, with its Issues beside it", () => {
		expect(
			notificationLink({
				kind: "schedule",
				scheduleId: "s-1",
				day: "2026-10-14",
			})
		).toMatchObject({ search: { week: "2026-10-12", panel: "issues" } });
	});

	it("opens a rostered member's own view of a roster by its id", () => {
		expect(notificationLink({ kind: "myRoster", scheduleId: "s-1" })).toEqual({
			to: "/me/schedules/$scheduleId",
			params: { scheduleId: "s-1" },
		});
	});

	it("opens a people import's result on its Settings › Data page", () => {
		expect(notificationLink({ kind: "import", importId: "import-1" })).toEqual({
			to: "/settings/data/import-people",
			search: { import: "import-1" },
		});
	});

	it("opens the member's own roster with the offer's card", () => {
		expect(
			notificationLink({ kind: "offer", scheduleId: "s-1", offerId: "o-1" })
		).toEqual({
			to: "/me/schedules/$scheduleId",
			params: { scheduleId: "s-1" },
			search: { offer: "o-1" },
		});
	});
});
