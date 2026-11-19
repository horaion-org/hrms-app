import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import {
	WeekPartsCallout,
	type WeekPartsCalloutProps,
} from "@/features/scheduling/schedules/WeekPartsCallout";

const OTHER_PART_LINE = {
	text: "Feb 20 – 21, 2027 are a separate part of the roster.",
	action: {
		kind: "openSchedule",
		part: { scheduleId: "s-2", state: "TO_REVIEW" },
		label: "Open Feb 20 – 21, 2027",
	},
} as const;
const LATER_LINE = {
	text: "Feb 20 – 21, 2027 can be scheduled later.",
	action: {
		kind: "scheduleDays",
		days: { from: "2027-02-20", to: "2027-02-21" },
		label: "Schedule Feb 20 – 21, 2027",
	},
} as const;

/** Renders the callout at Department d-1. */
const renderCallout = async (
	props: Pick<WeekPartsCalloutProps, "lines" | "mayCreateHere">
): Promise<void> => {
	render(
		<MemoryRouterHarness>
			<WeekPartsCallout departmentId="d-1" {...props} />
		</MemoryRouterHarness>
	);
	await screen.findByRole("note");
};

describe("WeekPartsCallout", () => {
	it("given_daysInAnotherSchedule_when_rendered_then_linksThatSchedulesRoster", async () => {
		await renderCallout({ lines: [OTHER_PART_LINE], mayCreateHere: false });

		expect(screen.getByText(OTHER_PART_LINE.text)).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Open Feb 20 – 21, 2027" })
		).toHaveAttribute("href", "/scheduling/s-2");
	});

	it("given_daysToScheduleLater_when_mayCreate_then_offersToScheduleThem", async () => {
		await renderCallout({ lines: [LATER_LINE], mayCreateHere: true });

		expect(
			screen.getByRole("link", { name: "Schedule Feb 20 – 21, 2027" })
		).toHaveAttribute(
			"href",
			"/scheduling/new?department=d-1&for=dates&firstDay=2027-02-20&lastDay=2027-02-21"
		);
	});

	it("given_daysToScheduleLater_when_mayNotCreate_then_onlySaysSo", async () => {
		await renderCallout({ lines: [LATER_LINE], mayCreateHere: false });

		expect(screen.getByText(LATER_LINE.text)).toBeInTheDocument();
		expect(screen.queryByRole("link")).toBeNull();
	});

	it("given_noLines_when_rendered_then_nothing", () => {
		const { container } = render(
			<WeekPartsCallout mayCreateHere departmentId="d-1" lines={[]} />
		);

		expect(container).toBeEmptyDOMElement();
	});
});
