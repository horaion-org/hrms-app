import { render, screen } from "@testing-library/react";
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

beforeAll(() => {
	// jsdom has no scrolling or layout. Verify visibility in Storybook instead.
	Object.defineProperty(Element.prototype, "scrollTo", {
		configurable: true,
		value: vi.fn(),
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
