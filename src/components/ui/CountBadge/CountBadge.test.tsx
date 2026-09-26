import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountBadge } from "@/components/ui/CountBadge";

describe("Count badge", () => {
	it("passes span props through and merges a custom className", () => {
		render(
			<CountBadge
				className="ml-2"
				count={5}
				data-count="pending"
				id="pending-count"
				title="Pending requests"
				tone="active"
			/>
		);
		const count = screen.getByText("5");
		expect(count).toHaveClass("ml-2");
		expect(count).toHaveAttribute("id", "pending-count");
		expect(count).toHaveAttribute("title", "Pending requests");
		expect(count).toHaveAttribute("data-count", "pending");
	});

	it.each([0, undefined])("renders nothing for count %s", (count) => {
		const { container } = render(<CountBadge count={count} tone="active" />);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders a waiting count as ordinary text", () => {
		render(<CountBadge count={5} tone="active" />);
		expect(screen.getByText("5")).toBeVisible();
	});

	it.each([
		[1, "1"],
		[99, "99"],
		[100, "99+"],
		[150, "99+"],
	])("displays count %s as %s", (count, text) => {
		render(<CountBadge count={count} tone="inactive" />);
		expect(screen.getByText(text)).toBeVisible();
	});
});
