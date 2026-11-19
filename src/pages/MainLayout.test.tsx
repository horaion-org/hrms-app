import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	currentUserReply,
	openApp,
	signedInShellRoutes,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";
import { MENU_COLLAPSED_KEY } from "@/pages/useMenuCollapsed";

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		...signedInShellRoutes(),
	});
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

/** The shell's own profile reply, with another employment type. */
const profileReplyOf = (employmentType: string): StubReply => {
	const shellProfile = signedInShellRoutes()[
		"GET /api/v1/companies/c-1/me/profile"
	] as { status: number; body: { data: object } };
	return {
		status: 200,
		body: envelope({ ...shellProfile.body.data, employmentType }),
	};
};

/** Opens the signed-in Dashboard and returns its main navigation. */
const openDashboard = async (): Promise<HTMLElement> => {
	app = await openApp("/");
	renderAuthApp(app);
	await screen.findByRole("heading", { name: "Dashboard" });
	return screen.getByRole("navigation", { name: "Main navigation" });
};

describe("MainLayout side menu", () => {
	it("starts expanded, showing each entry's name with no tooltip", async () => {
		const navigation = await openDashboard();

		const toggle = screen.getByRole("button", { name: "Collapse menu" });
		expect(toggle).toHaveAttribute("aria-expanded", "true");
		const dashboard = within(navigation).getByRole("link", {
			name: "Dashboard",
		});
		expect(dashboard).not.toHaveAttribute("title");
		expect(dashboard.querySelector("span")).not.toHaveClass("lg:sr-only");
		expect(screen.getByRole("img", { name: "Horaion" })).toBeInTheDocument();
	});

	it("collapses to named icons, keeps the current page marked and remembers the choice", async () => {
		const user = userEvent.setup();
		const navigation = await openDashboard();

		await user.click(screen.getByRole("button", { name: "Collapse menu" }));

		const toggle = screen.getByRole("button", { name: "Expand menu" });
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		// The name stays the accessible name and becomes the tooltip.
		const dashboard = within(navigation).getByRole("link", {
			name: "Dashboard",
		});
		expect(dashboard).toHaveAttribute("title", "Dashboard");
		expect(dashboard).toHaveAttribute("aria-current", "page");
		expect(dashboard.querySelector("span")).toHaveClass("lg:sr-only");
		const logOut = screen.getByRole("button", { name: "Log out" });
		expect(logOut).toHaveAttribute("title", "Log out");
		expect(screen.getByRole("link", { name: "Horaion" })).toBeInTheDocument();
		expect(localStorage.getItem(MENU_COLLAPSED_KEY)).toBe("true");

		await user.click(toggle);
		expect(
			screen.getByRole("button", { name: "Collapse menu" })
		).toHaveAttribute("aria-expanded", "true");
		expect(localStorage.getItem(MENU_COLLAPSED_KEY)).toBe("false");
	});

	it("lists the entries in menu order for a person who holds every key", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			...signedInShellRoutes(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace(PERMISSION_KEYS)),
			},
		});
		const navigation = await openDashboard();
		await within(navigation).findByRole("link", { name: "Reports" });

		const labels = within(navigation)
			.getAllByRole("link")
			.map((link) => link.textContent);
		expect(labels).toEqual([
			"Dashboard",
			"My roster",
			"Scheduling",
			"People",
			"Organisation",
			"Leave",
			"Shift preferences",
			"Availability",
			"Reports",
		]);
	});

	/** Entries behind a key the member lacks leave no visible item, so no gap (`empty:hidden`). */
	it("offers My roster, and no hidden entry, to a member who holds no key", async () => {
		const navigation = await openDashboard();

		const labels = within(navigation)
			.getAllByRole("link")
			.map((link) => link.textContent);
		expect(labels).toEqual([
			"Dashboard",
			"My roster",
			"Leave",
			"Shift preferences",
		]);
		expect(
			within(navigation).getByRole("link", { name: "My roster" })
		).toHaveAttribute("href", "/me/schedules");
		const emptyItems = within(navigation)
			.getAllByRole("listitem")
			.filter((item) => item.childElementCount === 0);
		expect(emptyItems.length).toBeGreaterThan(0);
		for (const item of emptyItems) expect(item).toHaveClass("empty:hidden");
	});

	/** Leave is for full-timers and whoever reads others' leave; Availability for part-timers and whoever reads theirs. */
	it.each([
		{
			who: "a part-timer with no key",
			type: "PART_TIME",
			keys: [],
			offered: ["Dashboard", "My roster", "Shift preferences", "Availability"],
		},
		{
			who: "a full-timer with no key",
			type: "FULL_TIME",
			keys: [],
			offered: ["Dashboard", "My roster", "Leave", "Shift preferences"],
		},
		{
			who: "a part-timer who may read the team's leave",
			type: "PART_TIME",
			keys: ["leave_request:read"],
			offered: [
				"Dashboard",
				"My roster",
				"Leave",
				"Shift preferences",
				"Availability",
			],
		},
	])("offers $who the entries $offered", async ({ type, keys, offered }) => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			...signedInShellRoutes(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace(keys)),
			},
			"GET /api/v1/companies/c-1/me/profile": profileReplyOf(type),
		});
		const navigation = await openDashboard();
		await within(navigation).findByRole("link", { name: "Shift preferences" });

		const labels = within(navigation)
			.getAllByRole("link")
			.map((link) => link.textContent);
		expect(labels).toEqual(offered);
	});

	it("opens collapsed when this browser collapsed it before", async () => {
		localStorage.setItem(MENU_COLLAPSED_KEY, "true");
		const navigation = await openDashboard();

		expect(screen.getByRole("button", { name: "Expand menu" })).toHaveAttribute(
			"aria-expanded",
			"false"
		);
		expect(
			within(navigation).getByRole("link", { name: "Leave" })
		).toHaveAttribute("title", "Leave");
	});
});
