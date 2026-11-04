import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import * as stories from "./ImportUploadStep.stories";

const { Checking, Refused } = composeStories(stories);

it("given_aRefusedFile_when_shown_then_saysWhyAndListsWhatTheFileShouldHold", () => {
	render(<Refused />);

	expect(screen.getByRole("alert")).toHaveTextContent(
		"Upload an .xlsx or .csv file."
	);
	const items = screen.getAllByRole("listitem");
	expect(items[0]).toHaveTextContent("Name: required.");
	expect(items).toHaveLength(3);
});

it("given_aFileBeingChecked_when_shown_then_holdsTheDropBackAndAnnouncesTheCheck", () => {
	render(<Checking />);

	expect(screen.getByLabelText(/choose a file/)).toBeDisabled();
	expect(screen.getByText(/Checking/)).toHaveAttribute("aria-live", "polite");
});
