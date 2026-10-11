import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";

describe("StatCard", () => {
	it("is a region named by its title, holding the figure and caption", () => {
		render(<StatCard caption="Active Branches" title="Branches" value="2" />);

		const card = screen.getByRole("region", { name: "Branches" });
		expect(
			within(card).getByRole("heading", { level: 2, name: "Branches" })
		).toBeVisible();
		expect(within(card).getByText("2")).toHaveClass(
			"text-4xl",
			"text-ink-blue-900"
		);
		expect(within(card).getByText("Active Branches")).toHaveClass(
			"text-sm",
			"text-neutral-700"
		);
	});

	it("gives each card its own heading id", () => {
		render(
			<>
				<StatCard caption="Active Branches" title="Branches" value="2" />
				<StatCard caption="Active Departments" title="Departments" value="6" />
			</>
		);

		expect(screen.getByRole("region", { name: "Branches" })).not.toBe(
			screen.getByRole("region", { name: "Departments" })
		);
	});

	it("places an action beside the title", () => {
		render(
			<StatCard
				action={<Button variant="hyperlink">View All</Button>}
				caption="Active Branches"
				title="Branches"
				value="2"
			/>
		);

		const heading = screen.getByRole("heading", { name: "Branches" });
		expect(heading.parentElement).toContainElement(
			screen.getByRole("button", { name: "View All" })
		);
	});

	it("renders no action slot content by default", () => {
		render(<StatCard caption="Active Branches" title="Branches" value="2" />);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("draws the design's bordered light card", () => {
		render(<StatCard caption="Active Branches" title="Branches" value="2" />);

		expect(screen.getByRole("region", { name: "Branches" })).toHaveClass(
			"rounded-lg",
			"border",
			"border-neutral-400",
			"bg-neutral-100",
			"p-6"
		);
	});

	it("merges caller classes and passes section attributes and ref through", () => {
		const ref = createRef<HTMLElement>();
		render(
			<StatCard
				ref={ref}
				caption="Active Branches"
				className="mt-2"
				data-stat="branches"
				title="Branches"
				value="2"
			/>
		);

		const card = screen.getByRole("region", { name: "Branches" });
		expect(card).toHaveClass("mt-2", "bg-neutral-100");
		expect(card).toHaveAttribute("data-stat", "branches");
		expect(ref.current).toBe(card);
	});

	it("given_children_when_rendered_then_showsThemAfterTheCaption", () => {
		render(
			<StatCard caption="Shifts Filled" title="Coverage" value="98.2%">
				<p>64% Resolved</p>
			</StatCard>
		);

		const card = screen.getByRole("region", { name: "Coverage" });
		expect(within(card).getByText("64% Resolved")).toBeInTheDocument();
	});

	it("given_theTileVariant_when_rendered_then_isTintedWithAnUppercaseTitle", () => {
		render(
			<StatCard
				size="lg"
				title="Active Workforce"
				value="1,620"
				variant="tile"
			/>
		);

		const card = screen.getByRole("region", { name: "Active Workforce" });
		expect(card).toHaveClass("bg-ink-blue-50");
		expect(within(card).getByRole("heading")).toHaveClass("uppercase");
		expect(within(card).getByText("1,620")).toHaveClass("text-[5rem]");
	});
});
