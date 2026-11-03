import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NotesIcon, PhoneIcon } from "@/components/ui/Icon";

describe("Card", () => {
	it("is a region named by its level 2 heading, holding its content", () => {
		render(
			<Card icon={PhoneIcon} title="Contact information">
				<p>+65 8324 7931</p>
			</Card>
		);

		const card = screen.getByRole("region", { name: "Contact information" });
		expect(
			within(card).getByRole("heading", {
				level: 2,
				name: "Contact information",
			})
		).toBeVisible();
		expect(within(card).getByText("+65 8324 7931")).toBeVisible();
	});

	it("draws the icon beside the title, hidden from assistive tech", () => {
		const { container } = render(
			<Card icon={PhoneIcon} title="Contact information" />
		);

		const icon = container.querySelector("svg");
		expect(icon).toHaveAttribute("aria-hidden", "true");
		expect(icon?.parentElement).toContainElement(
			screen.getByRole("heading", { name: "Contact information" })
		);
	});

	it("places an action beside the title", () => {
		render(
			<Card
				action={<Button variant="hyperlink">Add note</Button>}
				icon={NotesIcon}
				title="Notes (4)"
			/>
		);

		const header = screen.getByRole("heading", { name: "Notes (4)" })
			.parentElement?.parentElement;
		expect(header).toContainElement(
			screen.getByRole("button", { name: "Add note" })
		);
	});

	it("renders no action by default", () => {
		render(<Card icon={PhoneIcon} title="Contact information" />);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("uses a level 3 heading under another section's heading", () => {
		render(<Card headingLevel={3} icon={PhoneIcon} title="Contact" />);

		expect(
			screen.getByRole("heading", { level: 3, name: "Contact" })
		).toBeVisible();
		expect(screen.getByRole("region", { name: "Contact" })).toBeVisible();
	});

	it("gives each card its own heading id", () => {
		render(
			<>
				<Card icon={PhoneIcon} title="Contact information" />
				<Card icon={NotesIcon} title="Notes" />
			</>
		);

		expect(
			screen.getByRole("region", { name: "Contact information" })
		).not.toBe(screen.getByRole("region", { name: "Notes" }));
	});

	it("merges caller classes and passes section attributes and ref through", () => {
		const ref = createRef<HTMLElement>();
		render(
			<Card
				ref={ref}
				className="mt-2"
				data-card="contact"
				icon={PhoneIcon}
				title="Contact information"
			/>
		);

		const card = screen.getByRole("region", { name: "Contact information" });
		expect(card).toHaveClass("mt-2", "rounded-xl", "border-neutral-400");
		expect(card).toHaveAttribute("data-card", "contact");
		expect(ref.current).toBe(card);
	});
});
