import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { Button } from "@/components/ui/Button";

describe("OverflowMenu", () => {
	it("keeps clicked outside controls focused when dismissing", async () => {
		const user = userEvent.setup();
		render(
			<>
				<OverflowMenu label="Actions">
					<OverflowMenuItem>Edit</OverflowMenuItem>
				</OverflowMenu>
				<Button>Continue</Button>
			</>
		);
		const outside = screen.getByRole("button", { name: "Continue" });
		await user.click(screen.getByRole("button", { name: "Actions" }));
		await user.click(outside);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(outside).toHaveFocus();
	});

	it("adapts both cards to resolved top placement and clears it on close", async () => {
		const user = userEvent.setup();
		render(
			<OverflowMenu label="Actions">
				<OverflowMenuItem>Edit</OverflowMenuItem>
			</OverflowMenu>
		);
		const trigger = screen.getByRole("button", { name: "Actions" });
		await user.click(trigger);
		const menu = screen.getByRole("menu");
		await waitFor(() =>
			expect(trigger).toHaveAttribute("data-panel-anchor", "bottom start")
		);
		// jsdom cannot resolve viewport collisions. Exercise Headless UI's exposed
		// placement attribute; the coordinator verifies actual flipping in-browser.
		menu.setAttribute("data-anchor", "top start");
		await waitFor(() =>
			expect(trigger).toHaveAttribute("data-panel-anchor", "top start")
		);
		expect(trigger).toHaveClass(
			"data-open:data-[panel-anchor^=top]:rounded-b-lg"
		);
		expect(menu).toHaveClass(
			"data-[anchor^=top]:rounded-lg",
			"data-[anchor^=top]:border-t"
		);
		menu.setAttribute("data-anchor", "bottom start");
		await waitFor(() =>
			expect(trigger).toHaveAttribute("data-panel-anchor", "bottom start")
		);
		menu.setAttribute("data-anchor", "top start");
		await waitFor(() =>
			expect(trigger).toHaveAttribute("data-panel-anchor", "top start")
		);
		await user.keyboard("{Escape}");
		expect(trigger).not.toHaveAttribute("data-panel-anchor");
		// An old, detached panel must not affect the next opening.
		menu.setAttribute("data-anchor", "bottom start");
		await user.click(trigger);
		await waitFor(() =>
			expect(trigger).toHaveAttribute("data-panel-anchor", "bottom start")
		);
		menu.setAttribute("data-anchor", "top start");
		await user.keyboard("{ArrowDown}");
		expect(trigger).toHaveAttribute("data-panel-anchor", "bottom start");
	});

	it("closes an open menu when disabled and can open again when re-enabled", async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<OverflowMenu className="consumer-layout" label="Actions">
				<OverflowMenuItem>Edit</OverflowMenuItem>
			</OverflowMenu>
		);
		await user.click(screen.getByRole("button", { name: "Actions" }));
		expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
		const panel = screen.getByRole("menu");
		panel.setAttribute("data-anchor", "top start");
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Actions" })).toHaveAttribute(
				"data-panel-anchor",
				"top start"
			)
		);
		rerender(
			<OverflowMenu disabled className="consumer-layout" label="Actions">
				<OverflowMenuItem>Edit</OverflowMenuItem>
			</OverflowMenu>
		);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
		const disabledTrigger = screen.getByRole("button", { name: "Actions" });
		expect(disabledTrigger).toBeDisabled();
		expect(disabledTrigger).not.toHaveAttribute("data-panel-anchor");
		expect(disabledTrigger).toHaveAttribute("aria-expanded", "false");
		expect(disabledTrigger.parentElement).toHaveClass(
			"w-full",
			"consumer-layout"
		);
		rerender(
			<OverflowMenu
				className="consumer-layout"
				disabled={false}
				label="Actions"
			>
				<OverflowMenuItem>Edit</OverflowMenuItem>
			</OverflowMenu>
		);
		const enabledTrigger = screen.getByRole("button", { name: "Actions" });
		expect(enabledTrigger).toBeEnabled();
		expect(enabledTrigger).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		await user.click(enabledTrigger);
		expect(enabledTrigger).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
	});

	it("shows the disabled Neutral colours and not-allowed cursor without hover fill", async () => {
		const user = userEvent.setup();
		render(
			<OverflowMenu disabled label="Actions">
				<OverflowMenuItem>Edit</OverflowMenuItem>
			</OverflowMenu>
		);
		const trigger = screen.getByRole("button", { name: "Actions" });
		expect(trigger).toHaveAttribute("data-disabled");
		expect(trigger).toHaveClass(
			"data-disabled:bg-neutral-200",
			"border-neutral-400",
			"data-disabled:text-neutral-500",
			"data-disabled:cursor-not-allowed"
		);
		expect(trigger.querySelector("svg path")).toHaveAttribute(
			"stroke",
			"currentColor"
		);
		await user.hover(trigger);
		expect(trigger).not.toHaveAttribute("data-hover");
		expect(trigger).not.toHaveAttribute("data-open");
	});

	it("cannot open a disabled menu by pointer or keyboard and skips it when tabbing", async () => {
		const user = userEvent.setup();
		render(
			<>
				<OverflowMenu label="Before">
					<OverflowMenuItem>Edit</OverflowMenuItem>
				</OverflowMenu>
				<OverflowMenu disabled label="Unavailable actions">
					<OverflowMenuItem>Edit</OverflowMenuItem>
				</OverflowMenu>
				<OverflowMenu label="After">
					<OverflowMenuItem>Edit</OverflowMenuItem>
				</OverflowMenu>
			</>
		);
		const trigger = screen.getByRole("button", { name: "Unavailable actions" });
		await user.click(trigger);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toBeDisabled();
		// Disabled native buttons cannot take focus; dispatch directly to exercise
		// the trigger's keyboard guard rather than sending keys to document.body.
		for (const key of ["Enter", " ", "ArrowDown"]) {
			fireEvent.keyDown(trigger, { key });
			fireEvent.keyUp(trigger, { key });
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			expect(trigger).toHaveAttribute("aria-expanded", "false");
		}
		screen.getByRole("button", { name: "Before" }).focus();
		await user.tab();
		expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
		await user.tab({ shift: true });
		expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
	});

	it("uses state-driven card styling and a flush, trigger-width floating panel", async () => {
		const user = userEvent.setup();
		render(
			<OverflowMenu label="Actions">
				<OverflowMenuItem>Edit</OverflowMenuItem>
			</OverflowMenu>
		);
		const trigger = screen.getByRole("button", { name: "Actions" });
		expect(trigger).toHaveClass(
			"h-12",
			"px-4",
			"text-base",
			"font-semibold",
			"text-neutral-900",
			"bg-white",
			"border",
			"border-neutral-400",
			"rounded-lg",
			"data-hover:bg-neutral-100",
			"data-open:bg-ink-blue-50",
			"data-open:rounded-b-none",
			"focus-visible:outline-2",
			"focus-visible:outline-offset-2",
			"focus-visible:outline-ink-blue-500"
		);
		expect(trigger).not.toHaveAttribute("data-open");
		await user.hover(trigger);
		expect(trigger).toHaveAttribute("data-hover");
		await user.click(trigger);
		expect(trigger).toHaveAttribute("data-open");
		const menu = screen.getByRole("menu");
		expect(menu).toHaveAttribute("data-anchor", "bottom start");
		expect(menu).toHaveClass(
			"w-(--button-width)",
			"[--anchor-gap:0px]",
			"[--anchor-offset:0px]",
			"border",
			"border-t-0",
			"border-neutral-400",
			"rounded-b-lg",
			"divide-y",
			"divide-neutral-400",
			"shadow-md"
		);
		expect(menu).toHaveStyle({ position: "absolute" });
		expect(trigger.parentElement).not.toContainElement(menu);
		await user.keyboard("{Escape}");
		expect(trigger).not.toHaveAttribute("data-open");
	});

	it.each(["{Enter}", " ", "{ArrowDown}"])(
		"opens with %s and moves the highlight with arrow keys",
		async (key) => {
			const user = userEvent.setup();
			render(
				<OverflowMenu label="Actions">
					<OverflowMenuItem>Edit</OverflowMenuItem>
					<OverflowMenuItem>Archive</OverflowMenuItem>
				</OverflowMenu>
			);
			await user.tab();
			const trigger = screen.getByRole("button", { name: "Actions" });
			expect(trigger).toHaveFocus();
			await user.keyboard(key);
			const menu = screen.getByRole("menu");
			const edit = screen.getByRole("menuitem", { name: "Edit" });
			const archive = screen.getByRole("menuitem", { name: "Archive" });
			await waitFor(() => expect(menu).toHaveFocus());
			expect(menu).toHaveAttribute("aria-activedescendant", edit.id);
			expect(edit).toHaveAttribute("data-focus");
			await user.keyboard("{ArrowDown}");
			expect(menu).toHaveAttribute("aria-activedescendant", archive.id);
			expect(archive).toHaveAttribute("data-focus");
			expect(edit).not.toHaveAttribute("data-focus");
			await user.keyboard("{ArrowUp}");
			expect(menu).toHaveAttribute("aria-activedescendant", edit.id);
			await user.keyboard("{Escape}");
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			await waitFor(() => expect(trigger).toHaveFocus());
		}
	);

	it("dismisses on an outside click and returns focus to the header", async () => {
		const user = userEvent.setup();
		render(
			<OverflowMenu label="Actions">
				<OverflowMenuItem>Edit</OverflowMenuItem>
			</OverflowMenu>
		);
		const trigger = screen.getByRole("button", { name: "Actions" });
		await user.click(trigger);
		await user.click(document.body);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		await waitFor(() => expect(trigger).toHaveFocus());
	});

	it("opens a labelled action menu with a decorative icon", async () => {
		const user = userEvent.setup();
		render(
			<OverflowMenu className="consumer-layout" label="Actions">
				<OverflowMenuItem>Edit</OverflowMenuItem>
				<OverflowMenuItem>Archive</OverflowMenuItem>
			</OverflowMenu>
		);
		const trigger = screen.getByRole("button", { name: "Actions" });
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveAttribute("aria-haspopup", "menu");
		expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		expect(trigger.querySelector("svg")).toHaveClass("size-6", "shrink-0");
		expect(trigger.parentElement).toHaveClass("w-full", "consumer-layout");
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		const menu = screen.getByRole("menu", { name: "Actions" });
		expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
	});
});

describe("OverflowMenu icon variant", () => {
	it("names an icon-only trigger by its label and opens the actions below its end", async () => {
		const user = userEvent.setup();
		render(
			<OverflowMenu label="More actions for Orchard" variant="icon">
				<OverflowMenuItem>Edit</OverflowMenuItem>
				<OverflowMenuItem>Deactivate</OverflowMenuItem>
			</OverflowMenu>
		);
		const trigger = screen.getByRole("button", {
			name: "More actions for Orchard",
		});
		expect(trigger).toHaveTextContent("");
		expect(trigger).toHaveClass("size-9", "bg-transparent");
		expect(trigger).toHaveAttribute("aria-haspopup", "menu");
		expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

		await user.click(trigger);

		const menu = screen.getByRole("menu");
		expect(menu).toHaveAttribute("data-anchor", "bottom end");
		expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		await waitFor(() => expect(trigger).toHaveFocus());
	});

	it("cannot open when disabled", async () => {
		const user = userEvent.setup();
		render(
			<OverflowMenu disabled label="More actions" variant="icon">
				<OverflowMenuItem>Edit</OverflowMenuItem>
			</OverflowMenu>
		);
		const trigger = screen.getByRole("button", { name: "More actions" });

		await user.click(trigger);

		expect(trigger).toBeDisabled();
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});
});
