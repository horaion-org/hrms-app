import { HomeIcon } from "@heroicons/react/24/outline";
import { HomeIcon as HomeFilledIcon } from "@heroicons/react/24/solid";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
	vi,
} from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import {
	SidebarItem,
	type SidebarItemProps,
} from "@/components/layout/Sidebar";

beforeEach(() => {
	// jsdom has no scrolling; the router still uses the real browser boundary.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("SidebarItem", () => {
	it("keeps destinations restricted to registered router links", () => {
		expectTypeOf<string>().not.toExtend<SidebarItemProps["to"]>();
		expectTypeOf<"/" | "/example">().toExtend<SidebarItemProps["to"]>();
		expectTypeOf<"/scheduling">().not.toExtend<SidebarItemProps["to"]>();
	});

	it("passes anchor attributes, refs and router active/inactive props through", async () => {
		const ref = createRef<HTMLAnchorElement>();
		render(
			<MemoryRouterHarness>
				<SidebarItem
					ref={ref}
					activeIcon={HomeFilledIcon}
					className="custom-link"
					icon={HomeIcon}
					label="Scheduling"
					rel="noreferrer"
					target="_blank"
					title="Open Scheduling"
					to="/example"
					inactiveProps={{
						className: "custom-inactive",
						"aria-describedby": "hint",
					}}
				/>
				<SidebarItem
					activeIcon={HomeFilledIcon}
					icon={HomeIcon}
					label="Dashboard"
					to="/"
					activeProps={() => ({
						className: "custom-active",
						title: "Current Module",
					})}
				/>
			</MemoryRouterHarness>
		);
		const link = await screen.findByRole("link", { name: "Scheduling" });
		expect(ref.current).toBe(link);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noreferrer");
		expect(link).toHaveAttribute("title", "Open Scheduling");
		expect(link).toHaveAttribute("aria-describedby", "hint");
		expect(link).toHaveClass("custom-link", "custom-inactive");
		expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass(
			"custom-active"
		);
		expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
			"title",
			"Current Module"
		);
	});

	it("uses search matching for sample Modules and honours click handlers and hash navigation", async () => {
		const onClick = vi.fn();
		render(
			<MemoryRouterHarness initialEntry="/example?module=leave">
				<SidebarItem
					activeIcon={HomeFilledIcon}
					icon={HomeIcon}
					label="Leave"
					search={{ module: "leave" }}
					to="/example"
				/>
				<SidebarItem
					activeIcon={HomeFilledIcon}
					hash="team"
					icon={HomeIcon}
					label="People"
					search={{ module: "people" }}
					to="/example"
					activeOptions={{
						exact: true,
						includeSearch: true,
						includeHash: true,
					}}
					onClick={onClick}
				/>
			</MemoryRouterHarness>
		);
		const leave = await screen.findByRole("link", { name: "Leave" });
		const people = screen.getByRole("link", { name: "People" });
		expect(leave).toHaveAttribute("aria-current", "page");
		expect(people).not.toHaveAttribute("aria-current");
		expect(people).toHaveAttribute("href", "/example?module=people#team");
		await userEvent.click(people);
		expect(onClick).toHaveBeenCalledOnce();
		expect(people).toHaveAttribute("aria-current", "page");
		expect(leave).not.toHaveAttribute("aria-current");
	});
	it("moves the current-page announcement and filled icon when navigating by keyboard", async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouterHarness>
				<SidebarItem
					activeIcon={HomeFilledIcon}
					activeOptions={{ exact: true }}
					icon={HomeIcon}
					label="Dashboard"
					to="/"
				/>
				<SidebarItem
					activeIcon={HomeFilledIcon}
					icon={HomeIcon}
					label="Scheduling"
					to="/example"
				/>
			</MemoryRouterHarness>
		);
		const dashboard = await screen.findByRole("link", { name: "Dashboard" });
		const scheduling = screen.getByRole("link", { name: "Scheduling" });
		expect(dashboard).toHaveAttribute("aria-current", "page");
		expect(dashboard.querySelector("svg")).toHaveAttribute(
			"fill",
			"currentColor"
		);
		await user.tab();
		expect(dashboard).toHaveFocus();
		await user.tab();
		expect(scheduling).toHaveFocus();
		await user.keyboard("{Enter}");
		expect(scheduling).toHaveAttribute("aria-current", "page");
		expect(scheduling.querySelector("svg")).toHaveAttribute(
			"fill",
			"currentColor"
		);
		expect(scheduling.querySelector("svg")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(dashboard).not.toHaveAttribute("aria-current");
		expect(dashboard.querySelector("svg")).toHaveAttribute("fill", "none");
	});
	it("names the link by its label and hides its outline icon when inactive", async () => {
		render(
			<MemoryRouterHarness>
				<SidebarItem
					activeIcon={HomeFilledIcon}
					icon={HomeIcon}
					label="Scheduling"
					to="/example"
				/>
			</MemoryRouterHarness>
		);
		const link = await screen.findByRole("link", { name: "Scheduling" });
		expect(link).toHaveAttribute("href", "/example");
		expect(link).not.toHaveAttribute("aria-current");
		expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		expect(link.querySelector("svg")).toHaveAttribute("fill", "none");
	});
});
