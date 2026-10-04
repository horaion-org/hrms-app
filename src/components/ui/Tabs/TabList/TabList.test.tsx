import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterAll, beforeAll, expect, expectTypeOf, it, vi } from "vitest";
import {
	Tabs,
	TabList,
	Tab,
	TabPanels,
	TabPanel,
	type TabListProps,
} from "@/components/ui/Tabs";

const scrollTo = vi.fn();

beforeAll(() => {
	// jsdom has no scrolling or layout. Verify visibility in Storybook instead.
	Object.defineProperty(Element.prototype, "scrollTo", {
		configurable: true,
		value: scrollTo,
	});
});

afterAll(() => {
	Reflect.deleteProperty(Element.prototype, "scrollTo");
});

it("requires an accessible name and passes native list props through composed Tabs", () => {
	const ref = createRef<HTMLDivElement>();
	expectTypeOf<{ children: string }>().not.toExtend<TabListProps>();
	expectTypeOf<{ "aria-label": string }>().toExtend<TabListProps>();
	expectTypeOf<{ "aria-labelledby": string }>().toExtend<TabListProps>();
	render(
		<Tabs>
			<TabList
				ref={ref}
				aria-labelledby="profile-name"
				className="profile-list"
				data-testid="list"
				title="Views"
			>
				<Tab id="profile-name">Overview</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>Overview content</TabPanel>
			</TabPanels>
		</Tabs>
	);
	expect(screen.getByRole("tablist", { name: "Overview" })).toBe(
		screen.getByTestId("list")
	);
	expect(screen.getByRole("tablist")).toHaveClass("profile-list");
	expect(ref.current).toBe(screen.getByRole("tablist"));
	expect(screen.getByRole("tablist")).toHaveAttribute("title", "Views");
});

it("stacks a vertical list as a column without sideways scrolling", async () => {
	scrollTo.mockClear();
	const user = userEvent.setup();
	render(
		<Tabs orientation="vertical">
			<TabList aria-label="Settings" className="settings-nav">
				<Tab>General</Tab>
				<Tab>Notifications</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>General content</TabPanel>
				<TabPanel>Notifications content</TabPanel>
			</TabPanels>
		</Tabs>
	);
	const list = screen.getByRole("tablist", { name: "Settings" });
	expect(list).toHaveAttribute("aria-orientation", "vertical");
	expect(list).toHaveClass("flex", "flex-col", "settings-nav");
	expect(list).not.toHaveClass("overflow-x-auto", "flex-nowrap", "gap-6");
	await user.click(screen.getByRole("tab", { name: "Notifications" }));
	expect(scrollTo).not.toHaveBeenCalled();
});

it("keeps the horizontal list a single scrollable row", () => {
	render(
		<Tabs>
			<TabList aria-label="Profile">
				<Tab>Overview</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>Overview content</TabPanel>
			</TabPanels>
		</Tabs>
	);
	const list = screen.getByRole("tablist", { name: "Profile" });
	expect(list).toHaveAttribute("aria-orientation", "horizontal");
	expect(list).toHaveClass("flex-nowrap", "gap-6", "overflow-x-auto");
	expect(list).not.toHaveClass("flex-col");
});
