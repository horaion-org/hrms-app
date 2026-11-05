import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import * as stories from "./LeaveRequestDetails.stories";

const { Pending } = composeStories(stories);

it("given_aPendingRequest_when_shown_then_listsItsDetailsAndOnlyTheRowsTheApiSent", () => {
	render(<Pending />);

	expect(screen.getByText("Cheryl Ng")).toBeInTheDocument();
	expect(screen.getByText("Pending")).toBeInTheDocument();
	expect(screen.getByText("Remarks")).toBeInTheDocument();
	expect(screen.queryByText("Reviewed by")).not.toBeInTheDocument();
});
