import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider } from "@tanstack/react-router";
import { createMemoryRouter } from "@/common/createMemoryRouter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { Sidebar, SidebarItem } from "@/components/layout/Sidebar";
import {
	DashboardIcon,
	DashboardFilledIcon,
	SchedulingIcon,
	SchedulingFilledIcon,
} from "@/components/ui/Icon";

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("Sidebar", () => {
	it("navigates between Modules and home, moving the current announcement and filled icon", async () => {
		const user = userEvent.setup();
		const router = createMemoryRouter(
			<Sidebar>
				<SidebarItem
					activeIcon={DashboardFilledIcon}
					activeOptions={{ exact: true }}
					icon={DashboardIcon}
					label="Dashboard"
					to="/"
				/>
				<SidebarItem
					activeIcon={SchedulingFilledIcon}
					icon={SchedulingIcon}
					label="Scheduling"
					search={{ module: "scheduling" }}
					to="/register"
				/>
			</Sidebar>
		);
		await router.load();
		render(<RouterProvider router={router} />);
		const home = screen.getByRole("link", { name: "Horaion home" });
		const dashboard = screen.getByRole("link", { name: "Dashboard" });
		const scheduling = screen.getByRole("link", { name: "Scheduling" });
		// The logo links to "/", so the router marks it current on the Dashboard too.
		expect(home).toHaveAttribute("aria-current", "page");
		expect(dashboard).toHaveAttribute("aria-current", "page");
		expect(dashboard.querySelector("[fill=currentColor]")).not.toBeNull();
		expect(scheduling).not.toHaveAttribute("aria-current");
		expect(scheduling.querySelector("[fill=currentColor]")).toBeNull();
		await user.click(scheduling);
		expect(router.state.location.href).toBe("/register?module=scheduling");
		expect(scheduling).toHaveAttribute("aria-current", "page");
		expect(scheduling.querySelector("[fill=currentColor]")).not.toBeNull();
		expect(dashboard).not.toHaveAttribute("aria-current");
		expect(dashboard.querySelector("[fill=currentColor]")).toBeNull();
		expect(home).not.toHaveAttribute("aria-current");
		await user.click(home);
		expect(router.state.location.href).toBe("/");
		expect(dashboard).toHaveAttribute("aria-current", "page");
		expect(scheduling).not.toHaveAttribute("aria-current");
	});

	it("tabs from the logo through supplied items in order and activates with Enter", async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouterHarness>
				<Sidebar>
					{["Dashboard", "Scheduling", "Leave", "People", "Organisation"].map(
						(label) => (
							<SidebarItem
								key={label}
								activeIcon={DashboardFilledIcon}
								activeOptions={{ exact: true }}
								icon={DashboardIcon}
								label={label}
								to={label === "Dashboard" ? "/" : "/register"}
								search={
									label === "Dashboard" ? {} : { module: label.toLowerCase() }
								}
							/>
						)
					)}
				</Sidebar>
			</MemoryRouterHarness>
		);
		await screen.findByRole("navigation", { name: "Main navigation" });
		for (const name of [
			"Horaion home",
			"Dashboard",
			"Scheduling",
			"Leave",
			"People",
			"Organisation",
		]) {
			// Keyboard focus advances sequentially; parallel tabs would race.
			// eslint-disable-next-line no-await-in-loop
			await user.tab();
			expect(screen.getByRole("link", { name })).toHaveFocus();
		}
		await user.keyboard("{Enter}");
		expect(screen.getByRole("link", { name: "Organisation" })).toHaveAttribute(
			"aria-current",
			"page"
		);
		expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
			"aria-current"
		);
	});

	it("exposes supplied items as a labelled navigation list", async () => {
		render(
			<MemoryRouterHarness>
				<Sidebar className="consumer-layout">
					<SidebarItem
						activeIcon={DashboardFilledIcon}
						icon={DashboardIcon}
						label="Sample Module"
						to="/"
					/>
				</Sidebar>
			</MemoryRouterHarness>
		);
		const navigation = await screen.findByRole("navigation", {
			name: "Main navigation",
		});
		const list = within(navigation).getByRole("list");
		expect(within(list).getAllByRole("listitem")).toHaveLength(1);
		expect(
			within(list).getByRole("link", { name: "Sample Module" })
		).toBeVisible();
		expect(
			screen.queryByRole("link", { name: "Dashboard" })
		).not.toBeInTheDocument();
		expect(navigation.parentElement).toHaveClass("consumer-layout");
	});
});
