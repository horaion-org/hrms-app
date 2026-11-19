import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { Sidebar } from "@/components/layout/Sidebar";
import { HoraionLogo } from "@/components/layout/Sidebar/HoraionLogo";
// Registers bundled English as react-i18next's instance, so the logo reads "Horaion".
import "@/features/auth/testingI18n";

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("HoraionLogo", () => {
	it("names the home link after the Horaion mark it shows", async () => {
		render(
			<MemoryRouterHarness>
				<Sidebar menuLabel="Menu">{null}</Sidebar>
			</MemoryRouterHarness>
		);
		const home = await screen.findByRole("link", { name: "Horaion" });
		expect(home).toHaveAttribute("href", "/");
		const logo = screen.getByRole("img", { name: "Horaion" });
		expect(home).toContainElement(logo);
		// The 2x file keeps the mark sharp on high-density screens.
		expect(logo).toHaveAttribute("srcset", expect.stringContaining("2x"));
	});

	it("is 48 px, and 64 px from lg, by default", () => {
		render(<HoraionLogo />);
		expect(screen.getByRole("img", { name: "Horaion" })).toHaveClass(
			"size-12",
			"lg:size-16"
		);
	});

	/** The collapsed rail leaves 48 px of room, so the mark stays 48 px from lg too. */
	it("stays 48 px from lg when collapsed", () => {
		render(<HoraionLogo collapsed />);
		const logo = screen.getByRole("img", { name: "Horaion" });
		expect(logo).toHaveClass("size-12");
		expect(logo).not.toHaveClass("lg:size-16");
	});
});
