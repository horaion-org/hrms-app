import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChangeTimeline } from "@/features/scheduling/roster/ChangeTimeline";
import { changeDaysFixture } from "@/features/scheduling/roster/changeTimelineFixtures";

describe("ChangeTimeline", () => {
	it("heads each day applied, then each change with what it was and is now", () => {
		render(<ChangeTimeline days={changeDaysFixture()} />);

		expect(
			screen.getByRole("heading", { level: 3, name: "Mon, 16 Nov" })
		).toBeVisible();
		expect(screen.getByText("Aisha Rahman · Mon, 12 Oct")).toBeVisible();
		expect(screen.getByText("Day off")).toBeVisible();
		expect(screen.getByText("Front Desk AM · 09:00 – 15:00")).toBeVisible();
	});
});
