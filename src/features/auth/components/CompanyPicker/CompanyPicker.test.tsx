import { composeStories } from "@storybook/react-vite";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyPicker } from "@/features/auth/components/CompanyPicker";
import * as stories from "@/features/auth/components/CompanyPicker/CompanyPicker.stories";
import { renderAuthPage } from "@/features/auth/testing";

const { Several, NoCompany } = composeStories(stories);

beforeEach(() => {
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("CompanyPicker", () => {
	it("offers each Company by name and Workspace address", async () => {
		const onChoose = vi.fn();
		renderAuthPage(
			<CompanyPicker
				companies={Several.args.companies ?? []}
				onChoose={onChoose}
				onSignOut={vi.fn()}
			/>
		);

		expect(
			await screen.findByRole("heading", { name: "Choose a company" })
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: /Borealis Foods\s*borealis/ })
		);

		expect(onChoose).toHaveBeenCalledWith("c-2");
	});

	it("says so when there is no Company to open, and offers signing out", async () => {
		const onSignOut = vi.fn();
		renderAuthPage(
			<CompanyPicker companies={[]} onChoose={vi.fn()} onSignOut={onSignOut} />
		);

		expect(
			await screen.findByRole("heading", { name: "No company to open" })
		).toBeInTheDocument();
		expect(
			screen.getByText(/not an active member of any company/)
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Log out" }));

		expect(onSignOut).toHaveBeenCalledOnce();
	});

	it("renders its stories", async () => {
		renderAuthPage(<NoCompany />);

		expect(
			await screen.findByRole("button", { name: "Log out" })
		).toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});
});
