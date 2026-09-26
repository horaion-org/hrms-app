import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";

describe("OverflowMenuItem", () => {
	it("keeps a previously highlighted action white and inert when it becomes disabled", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		const { rerender } = render(
			<OverflowMenu label="Actions">
				<OverflowMenuItem onClick={onClick}>Archive</OverflowMenuItem>
			</OverflowMenu>
		);
		await user.tab();
		await user.keyboard("{ArrowDown}");
		const archive = screen.getByRole("menuitem", { name: "Archive" });
		expect(archive).toHaveAttribute("data-focus");
		rerender(
			<OverflowMenu label="Actions">
				<OverflowMenuItem disabled onClick={onClick}>
					Archive
				</OverflowMenuItem>
			</OverflowMenu>
		);
		expect(archive).toHaveAttribute("data-focus");
		expect(archive).toHaveAttribute("data-disabled");
		expect(archive).toHaveAttribute("aria-disabled", "true");
		expect(archive).toHaveClass(
			"bg-white",
			"data-focus:not-data-disabled:bg-neutral-100"
		);
		expect(archive).not.toHaveClass("data-focus:bg-neutral-100");
		await user.click(archive);
		expect(onClick).not.toHaveBeenCalled();
		expect(screen.getByRole("menu")).toBeVisible();
		await user.keyboard("{Enter}");
		expect(onClick).not.toHaveBeenCalled();
	});

	it.each(["{Enter}", " "])(
		"skips disabled actions in both directions before choosing with %s",
		async (key) => {
			const user = userEvent.setup();
			const onDisabled = vi.fn();
			const onEdit = vi.fn();
			render(
				<OverflowMenu label="Actions">
					<OverflowMenuItem onClick={onEdit}>Edit</OverflowMenuItem>
					<OverflowMenuItem disabled onClick={onDisabled}>
						Duplicate
					</OverflowMenuItem>
					<OverflowMenuItem>Archive</OverflowMenuItem>
				</OverflowMenu>
			);
			await user.tab();
			await user.keyboard("{ArrowDown}");
			const edit = screen.getByRole("menuitem", { name: "Edit" });
			const duplicate = screen.getByRole("menuitem", { name: "Duplicate" });
			expect(edit).toHaveAttribute("data-focus");
			await user.keyboard("{ArrowDown}");
			expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveAttribute(
				"data-focus"
			);
			expect(duplicate).not.toHaveAttribute("data-focus");
			await user.keyboard("{ArrowUp}");
			expect(edit).toHaveAttribute("data-focus");
			expect(duplicate).not.toHaveAttribute("data-focus");
			await user.keyboard(key);
			expect(onDisabled).not.toHaveBeenCalled();
			expect(onEdit).toHaveBeenCalledTimes(1);
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		}
	);

	it("keeps a disabled row white with Neutral 500 text and a not-allowed cursor on hover", async () => {
		const user = userEvent.setup();
		render(
			<OverflowMenu label="Actions">
				<OverflowMenuItem disabled>Archive</OverflowMenuItem>
			</OverflowMenu>
		);
		await user.click(screen.getByRole("button", { name: "Actions" }));
		const archive = screen.getByRole("menuitem", { name: "Archive" });
		await user.pointer([
			{ target: archive, coords: { screenX: 10, screenY: 10 } },
			{ target: archive, coords: { screenX: 11, screenY: 11 } },
		]);
		expect(archive).toHaveAttribute("data-disabled");
		expect(archive).not.toHaveAttribute("data-focus");
		expect(archive).toHaveClass(
			"bg-white",
			"data-disabled:text-neutral-500",
			"data-disabled:cursor-not-allowed"
		);
	});

	it("announces a disabled action and keeps the menu open when clicked", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(
			<OverflowMenu label="Actions">
				<OverflowMenuItem disabled onClick={onClick}>
					Archive
				</OverflowMenuItem>
			</OverflowMenu>
		);
		const trigger = screen.getByRole("button", { name: "Actions" });
		await user.click(trigger);
		const archive = screen.getByRole("menuitem", { name: "Archive" });
		await user.click(archive);
		expect(onClick).not.toHaveBeenCalled();
		expect(screen.getByRole("menu")).toBeVisible();
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(archive).toHaveAttribute("aria-disabled", "true");
	});

	it("highlights a 44px action row with the pointer and keyboard", async () => {
		const user = userEvent.setup();
		render(
			<OverflowMenu label="Actions">
				<OverflowMenuItem>Edit</OverflowMenuItem>
				<OverflowMenuItem>Archive</OverflowMenuItem>
			</OverflowMenu>
		);
		await user.click(screen.getByRole("button", { name: "Actions" }));
		const edit = screen.getByRole("menuitem", { name: "Edit" });
		expect(edit).toHaveClass(
			"h-11",
			"w-full",
			"px-4",
			"text-sm",
			"font-normal",
			"text-neutral-900",
			"bg-white",
			"data-focus:not-data-disabled:bg-neutral-100"
		);
		await user.pointer([
			{ target: edit, coords: { screenX: 10, screenY: 10 } },
			{ target: edit, coords: { screenX: 11, screenY: 11 } },
		]);
		expect(edit).toHaveAttribute("data-focus");
		await user.keyboard("{ArrowDown}");
		expect(edit).not.toHaveAttribute("data-focus");
		expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveAttribute(
			"data-focus"
		);
	});

	it("chooses the highlighted action once with Enter and returns focus", async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();
		const onArchive = vi.fn();
		render(
			<OverflowMenu label="Actions">
				<OverflowMenuItem onClick={onEdit}>Edit</OverflowMenuItem>
				<OverflowMenuItem onClick={onArchive}>Archive</OverflowMenuItem>
			</OverflowMenu>
		);
		await user.tab();
		await user.keyboard("{Enter}{ArrowDown}{Enter}");
		expect(onEdit).not.toHaveBeenCalled();
		expect(onArchive).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Actions" })).toHaveFocus()
		);
	});

	it("runs an action once on click, closes the menu and returns focus to its fixed label", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(
			<OverflowMenu label="Actions">
				<OverflowMenuItem onClick={onClick}>Edit</OverflowMenuItem>
			</OverflowMenu>
		);
		const trigger = screen.getByRole("button", { name: "Actions" });
		await user.click(trigger);
		await user.click(screen.getByRole("menuitem", { name: "Edit" }));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		await waitFor(() => expect(trigger).toHaveFocus());
	});
});
