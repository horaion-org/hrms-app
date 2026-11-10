import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import * as stories from "./StepChoices.stories";

const { AnyoneWhoCan, AllOfThesePeople } = composeStories(stories);

it("given_anyoneWhoCanDecides_when_shown_then_asksForNoPeople", () => {
	render(<AnyoneWhoCan />);

	expect(
		screen.getByRole("radio", {
			name: /Anyone who can publish in Front Office/,
		})
	).toBeChecked();
	expect(
		screen.queryByRole("radiogroup", { name: "How many of them" })
	).toBeNull();
});

it("given_onlyNamedPeople_when_shown_then_listsThemAndHowManyDecide", () => {
	render(<AllOfThesePeople />);

	expect(
		screen.getByRole("radio", { name: /Only these people/ })
	).toBeChecked();
	expect(screen.getByText("Siti Rahman")).toBeInTheDocument();
	expect(screen.getByRole("radio", { name: "All of them" })).toBeChecked();
});

it("given_anyoneWhoCanDecides_when_onlyThesePeopleIsChosen_then_asksWhoAndHowMany", async () => {
	const user = userEvent.setup();
	render(<AnyoneWhoCan />);

	await user.click(screen.getByRole("radio", { name: /Only these people/ }));

	expect(
		screen.getByRole("radiogroup", { name: "How many of them" })
	).toBeVisible();
	expect(screen.getByRole("radio", { name: "Any one of them" })).toBeChecked();
});
