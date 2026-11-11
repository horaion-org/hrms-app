import { composeStories } from "@storybook/react-vite";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import * as stories from "./AccessRoleHolders.stories";

const { Default, Inactive, ReadOnly, LoadFailed } = composeStories(stories);

it("shows what the role allows and who has it, and asks before removing someone", async () => {
	const user = userEvent.setup();
	render(<Default />);

	expect(await screen.findByText("This role allows")).toBeVisible();
	const table = screen.getByRole("table", { name: "People with this role" });
	expect(within(table).getByText("Daniel Tan")).toBeVisible();
	expect(screen.getByRole("button", { name: "Assign role" })).toBeVisible();

	await user.click(
		screen.getByRole("button", { name: "More actions for Daniel Tan" })
	);
	await user.click(screen.getByRole("menuitem", { name: "Delete" }));

	expect(
		await screen.findByRole("dialog", {
			name: "Remove Daniel Tan from this role",
		})
	).toBeVisible();
});

it("says an inactive role grants nothing and offers no assigning", async () => {
	render(<Inactive />);

	expect(await screen.findByText(/This role is inactive/u)).toBeVisible();
	expect(screen.queryByRole("button", { name: "Assign role" })).toBeNull();
});

it("offers nothing to change to someone who may only read roles", async () => {
	render(<ReadOnly />);

	expect(await screen.findByText("Daniel Tan")).toBeVisible();
	expect(screen.queryByRole("button", { name: "Assign role" })).toBeNull();
	expect(
		screen.getByRole("button", { name: "Edit Daniel Tan" })
	).toBeDisabled();
});

it("says when who holds the role couldn't be loaded", async () => {
	render(<LoadFailed />);

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"We couldn’t load who holds this role."
	);
});
