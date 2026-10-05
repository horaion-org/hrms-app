import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	ConfirmDialog,
	type ConfirmDialogProps,
} from "@/components/ui/ConfirmDialog";

const show = (props: Partial<ConfirmDialogProps> = {}): void => {
	render(
		<ConfirmDialog
			cancelLabel="Cancel"
			confirmLabel="Deactivate branch"
			description="Orchard can be activated again."
			title="Deactivate branch"
			onClose={vi.fn()}
			onConfirm={vi.fn()}
			{...props}
		/>
	);
};

describe("ConfirmDialog", () => {
	it("asks the question and confirms from its named button", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		show({ onConfirm, children: <p>Affects 3 people.</p> });

		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate branch",
		});
		expect(dialog).toHaveTextContent("Orchard can be activated again.");
		expect(dialog).toHaveTextContent("Affects 3 people.");
		await user.click(screen.getByRole("button", { name: "Deactivate branch" }));

		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it("closes without confirming when cancelled", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		const onClose = vi.fn();
		show({ onConfirm, onClose });

		await user.click(await screen.findByRole("button", { name: "Cancel" }));

		expect(onClose).toHaveBeenCalledOnce();
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("can't be confirmed twice or cancelled while the action is under way", async () => {
		show({ submitting: true });

		expect(
			await screen.findByRole("button", { name: "Deactivate branch" })
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
	});

	it("holds confirming back when told to, e.g. until what is affected has loaded", async () => {
		show({ confirmDisabled: true });

		expect(
			await screen.findByRole("button", { name: "Deactivate branch" })
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
	});

	it("says why the last attempt failed", async () => {
		show({ error: "We couldn’t deactivate the branch. Try again." });

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t deactivate the branch. Try again."
		);
	});
});
