import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Disclosure } from "@/components/ui/Disclosure";

describe("Disclosure", () => {
	it("starts closed and opens and closes from its button", async () => {
		const user = userEvent.setup();
		render(
			<Disclosure title="More options">
				<p>Hidden option</p>
			</Disclosure>
		);
		const button = screen.getByRole("button", { name: "More options" });
		expect(button).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Hidden option")).not.toBeInTheDocument();

		await user.click(button);
		expect(button).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Hidden option")).toBeVisible();

		await user.click(button);
		expect(screen.queryByText("Hidden option")).not.toBeInTheDocument();
	});

	it("starts open when asked", () => {
		render(
			<Disclosure defaultOpen title="More options">
				<p>Shown option</p>
			</Disclosure>
		);
		expect(
			screen.getByRole("button", { name: "More options" })
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Shown option")).toBeVisible();
	});

	it("opens from the keyboard", async () => {
		const user = userEvent.setup();
		render(
			<Disclosure title="More options">
				<p>Hidden option</p>
			</Disclosure>
		);
		await user.tab();
		await user.keyboard("{Enter}");
		expect(screen.getByText("Hidden option")).toBeVisible();
	});

	it("opens and closes the same way when drawn inline", async () => {
		const user = userEvent.setup();
		render(
			<Disclosure title="Details" variant="inline">
				<p>Hidden detail</p>
			</Disclosure>
		);
		await user.click(screen.getByRole("button", { name: "Details" }));
		expect(screen.getByText("Hidden detail")).toBeVisible();
	});

	it("never submits the form it sits in", async () => {
		const user = userEvent.setup();
		let submitted = false;
		render(
			<form
				onSubmit={(event) => {
					event.preventDefault();
					submitted = true;
				}}
			>
				<Disclosure title="More options">
					<p>Option</p>
				</Disclosure>
			</form>
		);
		await user.click(screen.getByRole("button", { name: "More options" }));
		expect(submitted).toBe(false);
	});
});
