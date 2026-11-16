import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { SettingsNav } from "@/features/settings/SettingsNav";
import {
	visibleGroups,
	type SettingsSection,
} from "@/features/settings/sections";

beforeEach(() => {
	// jsdom has no scrolling; the router still uses the real browser boundary.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

const EVERYTHING = visibleGroups({
	employment: true,
	scheduling: true,
	"roster-approvals": true,
	"leave-types": true,
	"leave-durations": true,
	"leave-approvals": true,
	access: true,
	data: true,
});

/** Renders the full list at `entry` with `selected` as the shown section. */
const renderNav = async (
	selected: SettingsSection,
	entry = `/settings?section=${selected}`
): Promise<HTMLElement> => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<MemoryRouterHarness initialEntry={entry}>
				<SettingsNav groups={EVERYTHING} selected={selected} />
			</MemoryRouterHarness>
		</I18nextProvider>
	);
	return screen.findByRole("navigation", { name: "Settings sections" });
};

describe("SettingsNav", () => {
	it("lists each group under its label, in order", async () => {
		const nav = await renderNav("general");
		expect(within(nav).getAllByRole("list")).toHaveLength(5);
		const leave = within(nav).getByRole("list", { name: "Leave" });
		expect(
			within(leave)
				.getAllByRole("link")
				.map((link) => link.textContent)
		).toEqual(["Leave types", "Leave durations", "Leave approvals"]);
		expect(
			within(nav).getByRole("list", { name: "Rostering" })
		).toHaveTextContent("Employment termsWork policyRoster approvals");
	});

	it("links each entry to its section, and Access roles to its own page", async () => {
		const nav = await renderNav("general");
		expect(
			within(nav).getByRole("link", { name: "Leave durations" })
		).toHaveAttribute("href", "/settings?section=leave-durations");
		expect(
			within(nav).getByRole("link", { name: "General" })
		).toHaveAttribute("href", "/settings?section=general");
		expect(
			within(nav).getByRole("link", { name: "Access roles" })
		).toHaveAttribute("href", "/settings/access-roles");
	});

	it("marks only the shown section current, also when the address names none", async () => {
		const nav = await renderNav("general", "/settings");
		const current = within(nav)
			.getAllByRole("link")
			.filter((link) => link.getAttribute("aria-current") === "page");
		expect(current.map((link) => link.textContent)).toEqual(["General"]);
	});

	it("marks the section from the address current", async () => {
		const nav = await renderNav("leave-approvals");
		expect(
			within(nav).getByRole("link", { name: "Leave approvals" })
		).toHaveAttribute("aria-current", "page");
		expect(
			within(nav).getByRole("link", { name: "Leave types" })
		).not.toHaveAttribute("aria-current");
	});
});
