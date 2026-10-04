import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Badge, badgeTones } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

describe("Badge", () => {
	it("exposes the full label in its default hover title", () => {
		render(<Badge>Pending approval from the department manager</Badge>);

		expect(
			screen.getByText("Pending approval from the department manager")
		).toHaveAttribute("title", "Pending approval from the department manager");
	});

	it.each([
		{
			title: "Awaiting manager approval",
			expected: "Awaiting manager approval",
		},
		{ title: "", expected: "" },
		{ title: undefined, expected: "Pending" },
	])(
		"uses title $title with the label as its fallback",
		({ title, expected }) => {
			render(<Badge title={title}>Pending</Badge>);

			expect(screen.getByText("Pending")).toHaveAttribute("title", expected);
		}
	);

	it("constrains a long label to one ellipsized line while preserving its shape and full text", () => {
		render(<Badge>Pending approval from the department manager</Badge>);

		const badge = screen.getByText(
			"Pending approval from the department manager"
		);
		expect(badge).toHaveClass(
			"min-w-0",
			"max-w-full",
			"truncate",
			"rounded-full",
			"px-3"
		);
		expect(badge.textContent).toBe(
			"Pending approval from the department manager"
		);
	});

	it.each(badgeTones)("uses the specified colours for the %s tone", (tone) => {
		const expectedColours = {
			success: ["bg-success-100", "text-success-900"],
			warning: ["bg-warning-100", "text-neutral-900"],
			error: ["bg-error-100", "text-error-900"],
			neutral: ["bg-neutral-400", "text-neutral-800"],
		};
		render(<Badge tone={tone}>Request state</Badge>);

		expect(screen.getByText("Request state")).toHaveClass(
			...expectedColours[tone]
		);
	});

	it("renders its label as a plain span skipped by keyboard navigation", async () => {
		const user = userEvent.setup();
		render(
			<>
				<Badge>Pending</Badge>
				<Button>Continue</Button>
			</>
		);

		const badge = screen.getByText("Pending");
		expect(badge.tagName).toBe("SPAN");
		expect(badge).not.toHaveAttribute("role");
		expect(badge.tabIndex).toBe(-1);
		await user.tab();
		expect(screen.getByRole("button", { name: "Continue" })).toHaveFocus();
	});

	it("uses Neutral colours by default and when explicitly requested", () => {
		const { rerender } = render(<Badge>Pending</Badge>);
		expect(screen.getByText("Pending")).toHaveClass(
			"bg-neutral-400",
			"text-neutral-800"
		);

		rerender(<Badge tone="neutral">Pending</Badge>);
		expect(screen.getByText("Pending")).toHaveClass(
			"bg-neutral-400",
			"text-neutral-800"
		);
	});

	it("styles a compact rounded label while preserving sentence case", () => {
		render(<Badge>Pending review</Badge>);

		const badge = screen.getByText("Pending review");
		expect(badge.textContent).toBe("Pending review");
		expect(badge).toHaveClass(
			"inline-block",
			"rounded-full",
			"font-normal",
			"text-sm",
			"leading-6",
			"px-3"
		);
		expect(badge).not.toHaveClass("uppercase", "capitalize");
	});

	it("merges caller classes and passes span attributes and ref through", () => {
		const ref = createRef<HTMLSpanElement>();
		render(
			<Badge
				ref={ref}
				aria-label="Leave request pending"
				className="mt-2"
				data-request="leave"
				id="request-state"
			>
				Pending
			</Badge>
		);

		const badge = screen.getByText("Pending");
		expect(badge).toHaveClass("mt-2", "bg-neutral-400", "text-neutral-800");
		expect(badge).toHaveAttribute("id", "request-state");
		expect(badge).toHaveAttribute("data-request", "leave");
		expect(badge).toHaveAttribute("aria-label", "Leave request pending");
		expect(ref.current).toBe(badge);
	});
});
