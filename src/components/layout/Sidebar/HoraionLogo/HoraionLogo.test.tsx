import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { Sidebar } from "@/components/layout/Sidebar";
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
});
