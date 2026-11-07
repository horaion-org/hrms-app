import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RosterHeaderCount } from "./RosterHeaderCount";

describe("RosterHeaderCount", () => {
	it("given_issuesToLookAt_when_chosen_then_opensThemFromItself", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<RosterHeaderCount
				count={{ count: 2, tone: "attention" }}
				label="Ben Ong: 2 to look at. Show in Issues"
				onSelect={onSelect}
			/>
		);

		const button = screen.getByRole("button", {
			name: "Ben Ong: 2 to look at. Show in Issues",
		});
		expect(button).toHaveTextContent("2");
		expect(button.querySelector("svg")).toHaveClass("text-warning-900");
		expect(button).not.toHaveAttribute("aria-haspopup");
		await user.click(button);
		expect(onSelect).toHaveBeenCalledWith(button);
	});

	it.each([
		[{ count: 1, tone: "info" } as const, "1", "text-ink-blue-700"],
		[{ count: 140, tone: "attention" } as const, "99+", "text-warning-900"],
	])(
		"given_%j_when_rendered_then_readsItsNumberInItsTone",
		(count, text, tone) => {
			render(
				<RosterHeaderCount count={count} label="Saturday" onSelect={vi.fn()} />
			);

			const button = screen.getByRole("button", { name: "Saturday" });
			expect(button).toHaveTextContent(text);
			expect(button.querySelector("svg")).toHaveClass(tone);
		}
	);
});
