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
		expect(notificationLink({ kind: "schedule", scheduleId: "s-1" })).toEqual({
			to: "/scheduling/$scheduleId",
			params: { scheduleId: "s-1" },
		});
	});

	it("opens a people import's result on its Settings › Data page", () => {
		expect(notificationLink({ kind: "import", importId: "import-1" })).toEqual({
			to: "/settings/data/import-people",
			search: { import: "import-1" },
		});
	});
});
