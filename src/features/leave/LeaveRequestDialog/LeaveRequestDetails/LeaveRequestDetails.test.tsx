import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { leaveFixture } from "@/features/leave/fixtures";
import * as stories from "./LeaveRequestDetails.stories";

const { Pending, PartDay } = composeStories(stories);

it("given_aPendingRequest_when_shown_then_listsItsDetailsAndOnlyTheRowsTheApiSent", () => {
	render(<Pending />);

	expect(screen.getByText("Cheryl Ng")).toBeInTheDocument();
	expect(screen.getByText("Pending")).toBeInTheDocument();
	expect(screen.getByText("Remarks")).toBeInTheDocument();
	expect(screen.queryByText("Reviewed by")).not.toBeInTheDocument();
});

it("given_aRequestMadeLateInNewYork_when_shown_then_readsTheBranchDayNotTheUtcOrBrowserOne", () => {
	const request = leaveFixture({
		leaveRequestId: "leave-early",
		requestedAt: "2026-11-09T03:00:00Z",
		branchTimeZone: "America/New_York",
	});
	render(<Pending request={request} />);

	expect(screen.getByText("Nov 08, 2026")).toBeInTheDocument();
	expect(screen.queryByText("Nov 09, 2026")).not.toBeInTheDocument();
});

it("given_aPartDay_when_shown_then_namesThePartUnderThePeriodAndCountsHours", () => {
	render(<PartDay />);

	expect(screen.getByText("Morning 09:00–13:00")).toBeInTheDocument();
	expect(screen.getByText("4 h")).toBeInTheDocument();
});
