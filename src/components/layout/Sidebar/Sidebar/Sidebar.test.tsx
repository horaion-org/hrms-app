import { Button } from "@/components/ui/Button";
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
			<Sidebar menuLabel="Menu">
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
				<Sidebar menuLabel="Menu">
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
		await user.tab();
		expect(screen.getByRole("link", { name: "Horaion home" })).toHaveFocus();
		// The small-screen Menu button: CSS hides it from `sm`, which jsdom does not apply.
		await user.tab();
		expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
		await ["Dashboard", "Scheduling", "Leave", "People", "Organisation"].reduce(
			async (previous, name) => {
				await previous;
				await user.tab();
				expect(screen.getByRole("link", { name })).toHaveFocus();
			},
			Promise.resolve()
		);
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
				<Sidebar className="consumer-layout" menuLabel="Menu">
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
		expect(
			screen
				.getByRole("link", { name: "Horaion home" })
				.closest(".consumer-layout")
		).toHaveClass(
			"w-full",
			"lg:sticky",
			"lg:top-0",
			"lg:h-dvh",
			"lg:w-70",
			"overflow-y-auto"
		);
	});
});

it("renders a usable footer after navigation", async () => {
	const user = userEvent.setup();
	const logOut = vi.fn();
	render(
		<MemoryRouterHarness>
			<Sidebar
				footer={<Button onClick={logOut}>Log out</Button>}
				menuLabel="Menu"
			>
				{null}
			</Sidebar>
		</MemoryRouterHarness>
	);
	const button = await screen.findByRole("button", { name: "Log out" });
	expect(screen.getByRole("navigation")).not.toContainElement(button);
	await user.tab();
	expect(screen.getByRole("link", { name: "Horaion home" })).toHaveFocus();
	await user.tab();
	expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
	await user.tab();
	expect(button).toHaveFocus();
	await user.keyboard("{Enter}");
	expect(logOut).toHaveBeenCalledOnce();
});

describe("Sidebar below sm", () => {
	const renderWithTwoModules = async (): Promise<
		ReturnType<typeof createMemoryRouter>
	> => {
		const router = createMemoryRouter(
			<Sidebar footer={<Button>Log out</Button>} menuLabel="Menu">
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
		return router;
	};
	const menuPanel = (menu: HTMLElement): HTMLElement | null =>
		document.getElementById(menu.getAttribute("aria-controls") ?? "");

	it("starts as a bar with a closed Menu, so the page follows the bar", async () => {
		await renderWithTwoModules();
		const menu = screen.getByRole("button", { name: "Menu" });
		const panel = menuPanel(menu);

		expect(menu).toHaveAttribute("aria-expanded", "false");
		expect(menu).toHaveClass("lg:hidden");
		expect(panel).toContainElement(
			screen.getByRole("navigation", { name: "Main navigation" })
		);
		expect(panel).toContainElement(
			screen.getByRole("button", { name: "Log out" })
		);
		// Hidden below lg, always shown from lg.
		expect(panel).toHaveClass("hidden", "lg:flex");
	});

	it("opens the navigation from Menu and closes it again after a link is followed", async () => {
		const user = userEvent.setup();
		const router = await renderWithTwoModules();
		const menu = screen.getByRole("button", { name: "Menu" });
		const panel = menuPanel(menu);

		await user.click(menu);
		expect(menu).toHaveAttribute("aria-expanded", "true");
		expect(panel).toHaveClass("flex");
		expect(panel).not.toHaveClass("hidden");

		await user.click(screen.getByRole("link", { name: "Scheduling" }));
		expect(router.state.location.href).toBe("/register?module=scheduling");
		expect(menu).toHaveAttribute("aria-expanded", "false");
		expect(panel).toHaveClass("hidden");
	});

	it("closes from Menu without navigating", async () => {
		const user = userEvent.setup();
		await renderWithTwoModules();
		const menu = screen.getByRole("button", { name: "Menu" });

		await user.click(menu);
		await user.click(menu);
		expect(menu).toHaveAttribute("aria-expanded", "false");
		expect(menuPanel(menu)).toHaveClass("hidden");
	});
});
