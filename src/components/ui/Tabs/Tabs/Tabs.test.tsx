import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
	Tabs,
	TabList,
	Tab,
	TabPanels,
	TabPanel,
	type TabsProps,
	type TabPanelProps,
} from "@/components/ui/Tabs";

describe("Tabs", () => {
	it("keeps controlled selection until the parent accepts the clicked index", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn<(index: number) => void>();
		const views = (
			<>
				<TabList aria-label="Profile">
					<Tab>Overview</Tab>
					<Tab>Employment</Tab>
					<Tab>Documents</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Overview content</TabPanel>
					<TabPanel>Employment content</TabPanel>
					<TabPanel>Documents content</TabPanel>
				</TabPanels>
			</>
		);
		const { rerender } = render(
			<Tabs defaultIndex={0} selectedIndex={1} onChange={onChange}>
				{views}
			</Tabs>
		);
		expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(
			"Employment"
		);
		expect(screen.getByRole("tabpanel")).toHaveTextContent(
			"Employment content"
		);
		expect(onChange).not.toHaveBeenCalled();
		await user.click(screen.getByRole("tab", { name: "Documents" }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
		expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(
			"Employment"
		);
		expect(screen.getByRole("tabpanel")).toHaveTextContent(
			"Employment content"
		);
		expect(screen.queryByText("Documents content")).not.toBeInTheDocument();
		rerender(
			<Tabs defaultIndex={0} selectedIndex={2} onChange={onChange}>
				{views}
			</Tabs>
		);
		expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(
			"Documents"
		);
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Documents content");
		expect(screen.queryByText("Employment content")).not.toBeInTheDocument();
		expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
		await user.click(screen.getByRole("tab", { name: "Documents" }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
	});
	it.each([
		["{ArrowRight}", 2, "Documents"],
		["{ArrowLeft}", 0, "Overview"],
		["{Home}", 0, "Overview"],
		["{End}", 2, "Documents"],
		["{PageUp}", 0, "Overview"],
		["{PageDown}", 2, "Documents"],
	])(
		"handles %s with the requested index while the parent retains selection",
		async (key, index, name) => {
			const user = userEvent.setup();
			const onChange = vi.fn<(index: number) => void>();
			render(
				<Tabs selectedIndex={1} onChange={onChange}>
					<TabList aria-label="Profile">
						<Tab>Overview</Tab>
						<Tab>Employment</Tab>
						<Tab>Documents</Tab>
					</TabList>
					<TabPanels>
						<TabPanel>Overview content</TabPanel>
						<TabPanel>Employment content</TabPanel>
						<TabPanel>Documents content</TabPanel>
					</TabPanels>
				</Tabs>
			);
			await user.tab();
			await user.keyboard(key);
			expect(onChange).toHaveBeenCalledExactlyOnceWith(index);
			expect(screen.getByRole("tab", { name })).toHaveFocus();
			expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(
				"Employment"
			);
			expect(screen.getByRole("tabpanel")).toHaveTextContent(
				"Employment content"
			);
		}
	);
	it.each(["controlled", "uncontrolled"])(
		"does not notify for the selected or disabled Tab in %s mode",
		async (mode) => {
			const user = userEvent.setup();
			const onChange = vi.fn<(index: number) => void>();
			render(
				<Tabs
					defaultIndex={0}
					selectedIndex={mode === "controlled" ? 0 : undefined}
					onChange={onChange}
				>
					<TabList aria-label="Profile">
						<Tab>Overview</Tab>
						<Tab disabled>Unavailable</Tab>
						<Tab>Employment</Tab>
					</TabList>
					<TabPanels>
						<TabPanel>Overview content</TabPanel>
						<TabPanel>Unavailable content</TabPanel>
						<TabPanel>Employment content</TabPanel>
					</TabPanels>
				</Tabs>
			);
			await user.click(screen.getByRole("tab", { name: "Overview" }));
			await user.keyboard("{Enter} {Home}");
			await user.click(screen.getByRole("tab", { name: "Unavailable" }));
			expect(onChange).not.toHaveBeenCalled();
			expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(
				"Overview"
			);
			expect(screen.getByRole("tabpanel")).toHaveTextContent(
				"Overview content"
			);
		}
	);
	it("notifies for each uncontrolled change from defaultIndex and retains its own selection", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn<(index: number) => void>();
		render(
			<Tabs defaultIndex={1} onChange={onChange}>
				<TabList aria-label="Profile">
					<Tab>Overview</Tab>
					<Tab>Employment</Tab>
					<Tab>Documents</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Overview content</TabPanel>
					<TabPanel>Employment content</TabPanel>
					<TabPanel>Documents content</TabPanel>
				</TabPanels>
			</Tabs>
		);
		expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(
			"Employment"
		);
		expect(onChange).not.toHaveBeenCalled();
		await user.click(screen.getByRole("tab", { name: "Documents" }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Documents content");
		await user.keyboard("{ArrowRight}");
		expect(onChange).toHaveBeenNthCalledWith(2, 0);
		expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(
			"Overview"
		);
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Overview content");
		await user.click(screen.getByRole("tab", { name: "Overview" }));
		expect(onChange).toHaveBeenCalledTimes(2);
	});
	it("automatically selects with arrows, wraps, jumps with Home/End and PageUp/PageDown, then tabs into the panel", async () => {
		const user = userEvent.setup();
		render(
			<Tabs defaultIndex={1}>
				<TabList aria-label="Profile">
					<Tab>Overview</Tab>
					<Tab>Employment</Tab>
					<Tab>Documents</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Overview content</TabPanel>
					<TabPanel>Employment content</TabPanel>
					<TabPanel>Documents content</TabPanel>
				</TabPanels>
			</Tabs>
		);
		await user.tab();
		expect(screen.getByRole("tab", { name: "Employment" })).toHaveFocus();
		for (const [key, name] of [
			["{ArrowRight}", "Documents"],
			["{ArrowRight}", "Overview"],
			["{ArrowLeft}", "Documents"],
			["{ArrowLeft}", "Employment"],
			["{Home}", "Overview"],
			["{End}", "Documents"],
			["{PageUp}", "Overview"],
			["{PageDown}", "Documents"],
		] as const) {
			// Each key starts from the focus/selection left by the previous key.
			// eslint-disable-next-line no-await-in-loop
			await user.keyboard(key);
			expect(screen.getByRole("tab", { name, selected: true })).toHaveFocus();
			expect(screen.getAllByRole("tab", { selected: true })).toHaveLength(1);
			expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
			expect(screen.getByRole("tabpanel", { name })).toBeInTheDocument();
		}
		await user.tab();
		expect(screen.getByRole("tabpanel", { name: "Documents" })).toHaveFocus();
	});

	it.each([
		{ name: "TabList", Part: TabList },
		{ name: "Tab", Part: Tab },
		{ name: "TabPanels", Part: TabPanels },
		{ name: "TabPanel", Part: TabPanel },
	])("rejects $name outside Tabs", ({ Part }) => {
		expect(() => render(<Part aria-label="Orphan">Orphan</Part>)).toThrow(
			/missing a parent/
		);
	});
	it("accepts starting and controlled indexes but excludes alternative modes", () => {
		expectTypeOf<{ defaultIndex: number }>().toExtend<TabsProps>();
		expectTypeOf<TabsProps["selectedIndex"]>().toEqualTypeOf<
			number | undefined
		>();
		expectTypeOf<TabsProps["onChange"]>().toEqualTypeOf<
			((index: number) => void) | undefined
		>();
		expectTypeOf<
			Extract<
				keyof TabsProps,
				"manual" | "vertical" | "as" | "value" | "onValueChange"
			>
		>().toEqualTypeOf<never>();
		expectTypeOf<
			Extract<keyof TabPanelProps, "static" | "unmount" | "as">
		>().toEqualTypeOf<never>();
		render(
			<Tabs
				className="profile"
				data-testid="profile"
				defaultIndex={1}
				title="Profile views"
			>
				<TabList aria-label="Profile">
					<Tab>Overview</Tab>
					<Tab>Employment</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Overview content</TabPanel>
					<TabPanel>Employment content</TabPanel>
				</TabPanels>
			</Tabs>
		);
		expect(
			screen.getByRole("tab", { name: "Employment", selected: true })
		).toBeInTheDocument();
		expect(
			screen.getByRole("tabpanel", { name: "Employment" })
		).toBeInTheDocument();
		expect(screen.getByTestId("profile")).toHaveClass("profile");
		expect(screen.getByTestId("profile")).toHaveAttribute(
			"title",
			"Profile views"
		);
	});
	it("selects the first view and swaps mounted content when another tab is clicked", async () => {
		const user = userEvent.setup();
		render(
			<Tabs>
				<TabList aria-label="Profile">
					<Tab>Overview</Tab>
					<Tab>Employment</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Overview content</TabPanel>
					<TabPanel>Employment content</TabPanel>
				</TabPanels>
			</Tabs>
		);
		expect(
			screen.getByRole("tablist", { name: "Profile" })
		).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
		expect(
			screen.getByRole("tabpanel", { name: "Overview" })
		).toHaveTextContent("Overview content");
		expect(screen.queryByText("Employment content")).not.toBeInTheDocument();
		await user.click(screen.getByRole("tab", { name: "Employment" }));
		expect(screen.getAllByRole("tab", { selected: true })).toHaveLength(1);
		expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
			"aria-selected",
			"false"
		);
		expect(
			screen.getByRole("tabpanel", { name: "Employment" })
		).toHaveTextContent("Employment content");
		expect(screen.queryByText("Overview content")).not.toBeInTheDocument();
	});
});
