import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { FunctionComponent } from "@/common/types";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
	it("traps focus, closes with Escape, and restores the trigger", async () => {
		const user = userEvent.setup();
		const Harness = (): FunctionComponent => {
			const [open, setOpen] = useState(false);
			return (
				<>
					<button
						onClick={() => {
							setOpen(true);
						}}
					>
						Open
					</button>
					<Modal
						open={open}
						title="Request"
						onClose={() => {
							setOpen(false);
						}}
					>
						<button>Approve</button>
					</Modal>
				</>
			);
		};
		render(
			<I18nextProvider i18n={authTestI18n}>
				<Harness />
			</I18nextProvider>
		);
		await user.click(screen.getByRole("button", { name: "Open" }));
		const dialog = screen.getByRole("dialog", { name: "Request" });
		await waitFor(() => {
			expect(dialog).toContainElement(document.activeElement as HTMLElement);
		});
		await user.tab();
		await user.tab();
		await user.tab();
		expect(dialog).toContainElement(document.activeElement as HTMLElement);
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
		});
	});
});
