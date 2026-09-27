import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
	vi,
} from "vitest";
import { Link, type LinkProps } from "@/components/ui/Link";
import * as stories from "@/components/ui/Link/Link.stories";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";

beforeEach(() => {
	// jsdom has no scrolling; the router still uses the real browser boundary.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("Link", () => {
	it("only accepts registered routes and string labels", () => {
		expectTypeOf<string>().not.toExtend<LinkProps["to"]>();
		expectTypeOf<"/sign-up">().toExtend<LinkProps["to"]>();
		expectTypeOf<"/nowhere">().not.toExtend<LinkProps["to"]>();
		expectTypeOf<number>().not.toExtend<LinkProps["children"]>();
	});

	it("renders an anchor to its route", async () => {
		render(
			<MemoryRouterHarness>
				<Link to="/sign-up">Sign up</Link>
			</MemoryRouterHarness>
		);

		const link = await screen.findByRole("link", { name: "Sign up" });
		expect(link).toHaveAttribute("href", "/sign-up");
		expect(link).toHaveClass("text-ink-blue-900", "underline");
	});

	it("navigates when clicked", async () => {
		render(
			<MemoryRouterHarness initialEntry="/sign-in">
				<Link to="/sign-up">Sign up</Link>
				<Link to="/sign-in">Sign in</Link>
			</MemoryRouterHarness>
		);

		const signUp = await screen.findByRole("link", { name: "Sign up" });
		expect(signUp).not.toHaveAttribute("data-status", "active");

		await userEvent.click(signUp);

		expect(signUp).toHaveAttribute("data-status", "active");
	});

	it("applies the muted variant and merges a custom className", async () => {
		render(
			<MemoryRouterHarness>
				<Link className="ml-auto" to="/forgot-password" variant="muted">
					Help
				</Link>
			</MemoryRouterHarness>
		);

		expect(await screen.findByRole("link", { name: "Help" })).toHaveClass(
			"text-neutral-700",
			"ml-auto"
		);
	});
});

describe("Link stories", () => {
	const { Action, Muted } = composeStories(stories);

	it.each([
		{ Story: Action, name: "Sign up", href: "/sign-up" },
		{
			Story: Muted,
			name: "Having trouble logging in?",
			href: "/forgot-password",
		},
	])("renders $name", async ({ Story, name, href }) => {
		render(<Story />);

		expect(await screen.findByRole("link", { name })).toHaveAttribute(
			"href",
			href
		);
	});
});
