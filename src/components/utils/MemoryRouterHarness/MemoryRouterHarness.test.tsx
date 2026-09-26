import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

const exampleLink = (label: string): FunctionComponent => (
	<Link to="/example">{label}</Link>
);

describe("MemoryRouterHarness", () => {
	it("starts at the initial entry", async () => {
		render(
			<MemoryRouterHarness initialEntry="/example">
				{exampleLink("Example")}
			</MemoryRouterHarness>
		);
		expect(
			await screen.findByRole("link", { name: "Example" })
		).toHaveAttribute("aria-current", "page");
	});

	it("keeps the current location when it re-renders with new children", async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<MemoryRouterHarness>{exampleLink("Example")}</MemoryRouterHarness>
		);
		const link = await screen.findByRole("link", { name: "Example" });
		expect(link).not.toHaveAttribute("aria-current");
		await user.click(link);
		rerender(
			<MemoryRouterHarness>{exampleLink("Renamed")}</MemoryRouterHarness>
		);
		expect(screen.getByRole("link", { name: "Renamed" })).toHaveAttribute(
			"aria-current",
			"page"
		);
	});

	it("resets to a new initial entry", async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<MemoryRouterHarness initialEntry="/">
				{exampleLink("Example")}
			</MemoryRouterHarness>
		);
		await user.click(await screen.findByRole("link", { name: "Example" }));
		rerender(
			<MemoryRouterHarness initialEntry="/?reset">
				{exampleLink("Example")}
			</MemoryRouterHarness>
		);
		expect(
			await screen.findByRole("link", { name: "Example" })
		).not.toHaveAttribute("aria-current");
	});
});
