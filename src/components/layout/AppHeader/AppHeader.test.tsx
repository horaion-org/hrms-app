import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";

describe("AppHeader", () => {
	it("is a banner landmark showing the title and actions", () => {
		render(
			<AppHeader actions={<Avatar name="John Doe" />} title="Welcome, John." />
		);

		const banner = screen.getByRole("banner");
		expect(within(banner).getByText("Welcome, John.")).toHaveClass(
			"text-2xl",
			"text-neutral-900"
		);
		expect(within(banner).getByRole("img", { name: "John Doe" })).toBeVisible();
	});

	it("leaves out the actions group when there are none", () => {
		render(<AppHeader title="Welcome, John." />);

		expect(screen.getByText("Welcome, John.").nextSibling).toBeNull();
	});

	it("draws the design's bottom rule", () => {
		render(<AppHeader title="Welcome, John." />);

		expect(screen.getByRole("banner")).toHaveClass(
			"border-b",
			"border-neutral-400",
			"min-h-22.5"
		);
	});

	it("merges caller classes and passes header attributes and ref through", () => {
		const ref = createRef<HTMLElement>();
		render(
			<AppHeader
				ref={ref}
				className="mt-2"
				data-area="shell"
				title="Welcome, John."
			/>
		);

		const banner = screen.getByRole("banner");
		expect(banner).toHaveClass("mt-2", "border-b");
		expect(banner).toHaveAttribute("data-area", "shell");
		expect(ref.current).toBe(banner);
	});
});
