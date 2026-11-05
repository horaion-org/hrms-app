import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import * as stories from "./RunningPeopleImport.stories";

const { Known, Unknown } = composeStories(stories);

it("given_aKnownRunningImport_when_shown_then_linksStraightToIt", async () => {
	render(<Known />);

	expect(await screen.findByRole("alert")).toBeVisible();
	expect(screen.getByRole("link")).toHaveAttribute(
		"href",
		"/settings/data/import-people?import=p-7"
	);
});

it("given_anUnnamedRunningImport_when_shown_then_linksToThePeopleImportPage", async () => {
	render(<Unknown />);

	expect(await screen.findByRole("link")).toHaveAttribute(
		"href",
		"/settings/data/import-people"
	);
});
