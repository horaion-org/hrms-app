import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { Sidebar } from "@/components/layout/Sidebar";

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("HoraionLogo", () => {
	it("decorates the named home link without a duplicate image announcement", async () => {
		render(
			<MemoryRouterHarness>
				<Sidebar>{null}</Sidebar>
			</MemoryRouterHarness>
		);
		const home = await screen.findByRole("link", { name: "Horaion home" });
		expect(home).toHaveAttribute("href", "/");
		expect(home.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		expect(home.querySelector("svg")).toHaveAttribute("focusable", "false");
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});
});
