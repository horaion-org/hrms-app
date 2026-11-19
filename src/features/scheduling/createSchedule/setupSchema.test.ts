import { describe, expect, it } from "vitest";
import {
	createScheduleWordingOf,
	openingScheduleFor,
	SCHEDULE_FOR,
} from "@/features/scheduling/createSchedule/setupSchema";

describe("SCHEDULE_FOR", () => {
	it("offers Dates first, then Month", () => {
		expect(SCHEDULE_FOR).toEqual(["dates", "month"]);
	});
});

describe("openingScheduleFor", () => {
	it.each([
		{ case: "a link with no choice", link: {}, opens: "dates" },
		{
			case: "a link naming a month",
			link: { month: "2026-12" },
			opens: "month",
		},
		{ case: "a link asking for Month", link: { for: "month" }, opens: "month" },
		{
			case: "a link asking for Dates over its month",
			link: { for: "dates", month: "2026-12" },
			opens: "dates",
		},
	] as const)("$case opens on $opens", ({ link, opens }) => {
		expect(openingScheduleFor(link)).toBe(opens);
	});
});

describe("createScheduleWordingOf", () => {
	it.each([
		{
			scheduleFor: "dates",
			wording: {
				title: "scheduling.dates.create.title",
				subtitle: "scheduling.dates.create.subtitle",
				setupDescription: "scheduling.dates.setup.description",
			},
		},
		{
			scheduleFor: "month",
			wording: {
				title: "scheduling.months.create.title",
				subtitle: "scheduling.months.create.subtitle",
				setupDescription: "scheduling.months.setup.description",
			},
		},
	] as const)(
		"$scheduleFor has its own wording",
		({ scheduleFor, wording }) => {
			expect(createScheduleWordingOf(scheduleFor)).toEqual(wording);
		}
	);
});
