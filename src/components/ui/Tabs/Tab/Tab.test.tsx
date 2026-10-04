import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { CountBadge, type CountBadgeProps } from "@/components/ui/CountBadge";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";

afterEach(() => {
	vi.restoreAllMocks();
});

it.each([
	{ count: undefined, name: "Pending", text: undefined },
	{ count: 0, name: "Pending", text: undefined },
	{ count: 1, name: "Pending 1", text: "1" },
	{ count: 99, name: "Pending 99", text: "99" },
	{ count: 100, name: "Pending 99+", text: "99+" },
])(
	"shows count $count as $name through composed Tabs",
	({ count, name, text }) => {
		render(
			<Tabs>
				<TabList aria-label="Leave requests">
					<Tab count={count}>Pending</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Pending requests</TabPanel>
				</TabPanels>
			</Tabs>
		);
		const tab = screen.getByRole("tab", { name });
		expect(screen.getByRole("tabpanel")).toHaveAccessibleName(name);
		if (text === undefined) {
			expect(tab).toHaveTextContent(/^Pending\s*$/);
			expect(within(tab).queryByText(/\d/)).not.toBeInTheDocument();
		} else {
			expect(within(tab).getByText(text)).toBeVisible();
		}
	}
);

it("includes the visible count in tab and panel names when switching views", async () => {
	const user = userEvent.setup();
	render(
		<Tabs>
			<TabList aria-label="Leave requests">
				<Tab count={3}>Pending</Tab>
				<Tab count={150}>Approved</Tab>
				<Tab disabled count={7}>
					Archived
				</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>Pending requests</TabPanel>
				<TabPanel>Approved requests</TabPanel>
				<TabPanel>Archived requests</TabPanel>
			</TabPanels>
		</Tabs>
	);
	expect(
		screen.getByRole("tab", { name: "Pending 3", selected: true })
	).toBeVisible();
	expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Pending 3");
	const approved = screen.getByRole("tab", { name: "Approved 99+" });
	await user.click(approved);
	expect(approved).toHaveAttribute("aria-selected", "true");
	expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Approved 99+");
	const archived = screen.getByRole("tab", { name: "Archived 7" });
	expect(archived).toBeDisabled();
	await user.click(archived);
	expect(approved).toHaveAttribute("aria-selected", "true");
});

it("renders each count with the Count badge tone matching its tab's state", async () => {
	const user = userEvent.setup();
	const toneClassName = (tone: CountBadgeProps["tone"]): string => {
		const { container, unmount } = render(<CountBadge count={1} tone={tone} />);
		const className = container.firstElementChild?.className ?? "";
		unmount();
		return className;
	};
	const active = toneClassName("active");
	const inactive = toneClassName("inactive");
	const disabled = toneClassName("disabled");
	render(
		<Tabs>
			<TabList aria-label="Leave requests">
				<Tab count={3}>Pending</Tab>
				<Tab count={5}>Approved</Tab>
				<Tab disabled count={7}>
					Archived
				</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>Pending requests</TabPanel>
				<TabPanel>Approved requests</TabPanel>
				<TabPanel>Archived requests</TabPanel>
			</TabPanels>
		</Tabs>
	);
	const badgeOf = (name: string, count: string): HTMLElement =>
		within(screen.getByRole("tab", { name })).getByText(count);
	expect(badgeOf("Pending 3", "3")).toHaveClass(active, { exact: true });
	expect(badgeOf("Approved 5", "5")).toHaveClass(inactive, { exact: true });
	expect(badgeOf("Archived 7", "7")).toHaveClass(disabled, { exact: true });
	await user.click(screen.getByRole("tab", { name: "Approved 5" }));
	expect(badgeOf("Pending 3", "3")).toHaveClass(inactive, { exact: true });
	expect(badgeOf("Approved 5", "5")).toHaveClass(active, { exact: true });
});

it("passes native tab props and a ref through composed Tabs and exposes interaction states", async () => {
	const user = userEvent.setup();
	const ref = createRef<HTMLButtonElement>();
	render(
		<Tabs>
			<TabList aria-label="Profile">
				<Tab>Overview</Tab>
				<Tab
					ref={ref}
					className="employment-tab"
					data-testid="employment"
					title="Employment view"
				>
					Employment
				</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>Overview content</TabPanel>
				<TabPanel>Employment content</TabPanel>
			</TabPanels>
		</Tabs>
	);
	const tab = screen.getByRole("tab", { name: "Employment" });
	expect(ref.current).toBe(tab);
	expect(tab).toBe(screen.getByTestId("employment"));
	expect(tab).toHaveClass("employment-tab");
	expect(tab).toHaveAttribute("title", "Employment view");
	expect(tab).not.toHaveAttribute("data-selected");
	await user.hover(tab);
	expect(tab).toHaveAttribute("data-hover");
	await user.unhover(tab);
	expect(tab).not.toHaveAttribute("data-hover");
	await user.tab();
	await user.keyboard("{ArrowRight}");
	expect(tab).toHaveAttribute("data-selected");
	expect(tab).toHaveAttribute("data-focus");
});

it("exposes a disabled tab as unavailable and ignores hover and clicks", async () => {
	const user = userEvent.setup();
	render(
		<Tabs>
			<TabList aria-label="Profile">
				<Tab>Overview</Tab>
				<Tab disabled>Employment</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>Overview content</TabPanel>
				<TabPanel>Employment content</TabPanel>
			</TabPanels>
		</Tabs>
	);
	const disabled = screen.getByRole("tab", { name: "Employment" });
	// Native disabled buttons expose unavailable semantics without aria-disabled.
	expect(disabled.tagName).toBe("BUTTON");
	expect(disabled).toBeDisabled();
	expect(disabled).toHaveAttribute("data-disabled");
	expect(disabled).toHaveAttribute("tabindex", "-1");
	await user.hover(disabled);
	expect(disabled).not.toHaveAttribute("data-hover");
	await user.click(disabled);
	expect(disabled).toHaveAttribute("aria-selected", "false");
	expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(
		"Overview"
	);
	expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
	expect(screen.getByRole("tabpanel", { name: "Overview" })).toHaveTextContent(
		"Overview content"
	);
	expect(screen.queryByText("Employment content")).not.toBeInTheDocument();
	await user.tab();
	expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();
	await user.tab();
	expect(screen.getByRole("tabpanel", { name: "Overview" })).toHaveFocus();
});

it("initially selects the first enabled tab and skips disabled tabs in both directions, wrapping and Home/End", async () => {
	// jsdom 30 focuses disabled buttons with tabindex=-1; browsers ignore focus().
	// Match the native boundary so Headless UI can skip failed focus attempts.
	// Preserve the original method, then invoke it with the actual button below.
	// eslint-disable-next-line @typescript-eslint/unbound-method
	const nativeFocus = HTMLButtonElement.prototype.focus;
	vi.spyOn(HTMLButtonElement.prototype, "focus").mockImplementation(function (
		this: HTMLButtonElement,
		options
	) {
		if (!this.matches(":disabled")) nativeFocus.call(this, options);
	});
	const user = userEvent.setup();
	render(
		<Tabs>
			<TabList aria-label="Profile">
				<Tab disabled>Overview</Tab>
				<Tab>Employment</Tab>
				<Tab disabled>Compensation</Tab>
				<Tab>Leave</Tab>
				<Tab disabled>Documents</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>Overview content</TabPanel>
				<TabPanel>Employment content</TabPanel>
				<TabPanel>Compensation content</TabPanel>
				<TabPanel>Leave content</TabPanel>
				<TabPanel>Documents content</TabPanel>
			</TabPanels>
		</Tabs>
	);
	expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(
		"Employment"
	);
	expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Employment");
	expect(screen.queryByText("Overview content")).not.toBeInTheDocument();
	await user.tab();
	expect(screen.getByRole("tab", { name: "Employment" })).toHaveFocus();
	for (const [key, name] of [
		["{ArrowRight}", "Leave"],
		["{ArrowRight}", "Employment"],
		["{ArrowLeft}", "Leave"],
		["{ArrowLeft}", "Employment"],
		["{End}", "Leave"],
		["{Home}", "Employment"],
	] as const) {
		// Each key continues from the preceding focus/selection.
		// eslint-disable-next-line no-await-in-loop
		await user.keyboard(key);
		expect(screen.getByRole("tab", { name, selected: true })).toHaveFocus();
		expect(screen.getAllByRole("tab", { selected: true })).toHaveLength(1);
		expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
		expect(screen.getByRole("tabpanel", { name })).toHaveTextContent(
			`${name} content`
		);
	}
});

it("describes a vertical tab with its visible description and keeps the label as its name", async () => {
	const user = userEvent.setup();
	render(
		<Tabs orientation="vertical">
			<TabList aria-label="Settings">
				<Tab description="Core workspace preferences.">General</Tab>
				<Tab
					aria-describedby="notifications-note"
					count={2}
					description="Control what you are notified about and how."
				>
					Notifications
				</Tab>
				<Tab disabled description="Configure approval workflows.">
					Scheduling
				</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>General content</TabPanel>
				<TabPanel>Notifications content</TabPanel>
				<TabPanel>Scheduling content</TabPanel>
			</TabPanels>
			<p id="notifications-note">Two unread</p>
		</Tabs>
	);
	const general = screen.getByRole("tab", {
		name: "General",
		description: "Core workspace preferences.",
		selected: true,
	});
	expect(screen.getByRole("tabpanel")).toHaveAccessibleName("General");
	expect(screen.getByText("Core workspace preferences.")).toBeVisible();
	expect(screen.getByText("Core workspace preferences.")).toHaveClass(
		"text-xs",
		"text-neutral-800"
	);
	expect(general).toHaveClass(
		"min-h-25",
		"border-b",
		"border-neutral-400",
		"not-data-disabled:data-selected:bg-neutral-100",
		"data-focus:-outline-offset-2"
	);
	expect(general).not.toHaveClass("h-10", "border-b-2", "whitespace-nowrap");
	// The chevron is decorative.
	expect(general.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	const notifications = screen.getByRole("tab", {
		name: "Notifications 2",
		description: "Control what you are notified about and how. Two unread",
	});
	await user.click(notifications);
	expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Notifications 2");
	const scheduling = screen.getByRole("tab", {
		name: "Scheduling",
		description: "Configure approval workflows.",
	});
	expect(scheduling).toBeDisabled();
	expect(screen.getByText("Configure approval workflows.")).toHaveClass(
		"text-neutral-400"
	);
	expect(scheduling.querySelector("svg")).toHaveClass("text-neutral-400");
});

it("keeps a horizontal tab one line high and exposes its description only to assistive technology", () => {
	render(
		<Tabs>
			<TabList aria-label="Profile">
				<Tab aria-describedby="hint" description="Personal and job details">
					Overview
				</Tab>
				<Tab>Employment</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>Overview content</TabPanel>
				<TabPanel>Employment content</TabPanel>
			</TabPanels>
			<p id="hint">Hint</p>
		</Tabs>
	);
	const overview = screen.getByRole("tab", {
		name: "Overview",
		description: "Personal and job details Hint",
	});
	expect(overview).toHaveClass("h-10", "whitespace-nowrap");
	expect(screen.getByText("Personal and job details")).toHaveClass("sr-only");
	expect(overview.querySelector("svg")).toBeNull();
	const employment = screen.getByRole("tab", { name: "Employment" });
	expect(employment).not.toHaveAttribute("aria-describedby");
});
