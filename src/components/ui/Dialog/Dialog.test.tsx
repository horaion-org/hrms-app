import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { Dialog } from "@/components/ui/Dialog";

const i18n = createInstance();
void i18n.init({ lng: "en", resources: { en: { translation: en } } });

const Example = ({
	preventClose = false,
}: {
	preventClose?: boolean;
}): FunctionComponent => {
	const [open, setOpen] = useState(false);
	return (
		<I18nextProvider i18n={i18n}>
			<Button
				onClick={() => {
					setOpen(true);
				}}
			>
				Create branch
			</Button>
			<Dialog
				open={open}
				preventClose={preventClose}
				title="Create branch"
				onClose={() => {
					setOpen(false);
				}}
			>
				<Button>Inside action</Button>
			</Dialog>
		</I18nextProvider>
	);
};

describe("Dialog", () => {
	it("closes with Escape and keeps keyboard focus inside while open", async () => {
		const user = userEvent.setup();
		render(<Example />);
		const opener = screen.getByRole("button", { name: "Create branch" });
		await user.click(opener);
		const close = screen.getByRole("button", { name: "Close" });
		await waitFor(() => {
			expect(screen.getByRole("dialog")).toHaveFocus();
		});
		await user.tab();
		expect(close).toHaveFocus();
		await user.tab({ shift: true });
		expect(screen.getByRole("button", { name: "Inside action" })).toHaveFocus();
		await user.tab();
		expect(close).toHaveFocus();
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		await waitFor(() => {
			expect(opener).toHaveFocus();
		});
	});

	it("prevents Escape and close-button dismissal while busy", async () => {
		const user = userEvent.setup();
		render(<Example preventClose />);
		await user.click(screen.getByRole("button", { name: "Create branch" }));
		const close = screen.getByRole("button", { name: "Close" });
		expect(close).toBeDisabled();
		await user.click(close);
		await user.keyboard("{Escape}");
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("closes with the translated close button and restores focus to the opener", async () => {
		const user = userEvent.setup();
		render(<Example />);
		const opener = screen.getByRole("button", { name: "Create branch" });
		await user.click(opener);
		await user.click(screen.getByRole("button", { name: "Close" }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		await waitFor(() => {
			expect(opener).toHaveFocus();
		});
	});

	it("announces its title and description and renders body and footer", () => {
		render(
			<I18nextProvider i18n={i18n}>
				<Dialog
					open
					description="Choose who leads the branch."
					footer={<button>Cancel</button>}
					title="Create branch"
					onClose={vi.fn()}
				>
					Branch details
				</Dialog>
			</I18nextProvider>
		);
		const dialog = screen.getByRole("dialog", { name: "Create branch" });
		expect(dialog).toHaveAttribute("aria-modal", "true");
		expect(dialog).toHaveAccessibleDescription("Choose who leads the branch.");
		expect(dialog).toHaveTextContent("Branch details");
		expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
	});
});
