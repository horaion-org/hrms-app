import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import * as stories from "@/features/auth/AccountMenu/AccountMenu.stories";

const { Default } = composeStories(stories);

describe("AccountMenu", () => {
	it("shows the person's initials and offers their own pages", async () => {
		render(<Default />);

		const trigger = await screen.findByRole("button", { name: "Account menu" });
		expect(trigger).toHaveTextContent("KC");
		await userEvent.setup().click(trigger);

		expect(
			screen.getByRole("menuitem", { name: "My profile" })
		).toHaveAttribute("href", "/me/profile");
		expect(
			screen.getByRole("menuitem", { name: "Change password" })
		).toHaveAttribute("href", "/me/password");
	});
});
