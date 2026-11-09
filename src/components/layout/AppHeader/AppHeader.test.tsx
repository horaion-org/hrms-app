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

	it("draws the design's bar with its bottom rule from lg only, where it stands alone", () => {
		render(<AppHeader title="Welcome, John." />);

		const banner = screen.getByRole("banner");
		expect(banner).toHaveClass(
			"lg:border-b",
			"lg:border-neutral-400",
			"lg:bg-white",
			"lg:min-h-22.5"
		);
		expect(banner).not.toHaveClass("border-b");
	});

	it("leaves the title to the page below lg, where the controls share the navigation bar", () => {
		render(<AppHeader title="Welcome, John." />);

		expect(screen.getByText("Welcome, John.")).toHaveClass("max-lg:hidden");
	});

	it("leaves out the title when there is none, so the controls take the whole bar", () => {
		render(<AppHeader actions={<Avatar name="John Doe" />} title={false} />);

		expect(screen.getByRole("img", { name: "John Doe" }).parentElement).toBe(
			screen.getByRole("banner").firstElementChild
		);
	});

	it("puts the scope before the actions and lets it shrink on a phone", () => {
		render(
			<AppHeader
				actions={<Avatar name="John Doe" />}
				scope={<span>Orchard</span>}
				title={false}
			/>
		);

		const scope = screen.getByText("Orchard").parentElement;
		expect(scope).toHaveClass("min-w-0", "flex-1", "sm:flex-none");
		expect(scope?.nextElementSibling).toBe(
			screen.getByRole("img", { name: "John Doe" })
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
		expect(banner).toHaveClass("mt-2", "lg:border-b");
		expect(banner).toHaveAttribute("data-area", "shell");
		expect(ref.current).toBe(banner);
	});
});
