import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { ActivityItem } from "@/components/ui/ActivityItem";
import { OrganisationIcon } from "@/components/ui/Icon";

describe("ActivityItem", () => {
	it("shows the title and details separated by decorative dots", () => {
		const { container } = render(
			<ActivityItem
				details={["by Aisha Rahman", <time key="t">2 hours ago</time>]}
				icon={OrganisationIcon}
				title="Branch created: Orchard"
			/>
		);

		expect(screen.getByText("Branch created: Orchard")).toHaveClass(
			"font-medium",
			"text-neutral-900"
		);
		const details = screen.getByText("by Aisha Rahman", { exact: false });
		expect(details.textContent).toBe("by Aisha Rahman•2 hours ago");
		expect(details).toHaveClass("text-sm", "text-neutral-700");
		expect(screen.getByText("•")).toHaveAttribute("aria-hidden", "true");
		expect(container.querySelector("time")).toHaveTextContent("2 hours ago");
	});

	it("skips empty details and drops the line when none remain", () => {
		const { rerender } = render(
			<ActivityItem
				details={[null, "2 hours ago", ""]}
				icon={OrganisationIcon}
				title="Branch created"
			/>
		);
		expect(screen.getByText("2 hours ago")).toBeVisible();
		expect(screen.queryByText("•")).not.toBeInTheDocument();

		rerender(<ActivityItem icon={OrganisationIcon} title="Branch created" />);
		expect(screen.getByText("Branch created").nextSibling).toBeNull();
	});

	it("draws a decorative icon on a light Ink Blue tile", () => {
		const { container } = render(
			<ActivityItem icon={OrganisationIcon} title="Branch created" />
		);

		const icon = container.querySelector("svg");
		expect(icon).toHaveAttribute("aria-hidden", "true");
		expect(icon).toHaveClass("size-7", "text-ink-blue-900");
		expect(icon?.parentElement).toHaveClass("size-13", "bg-ink-blue-100");
	});

	it("merges caller classes and passes div attributes and ref through", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(
			<ActivityItem
				ref={ref}
				className="mt-2"
				data-activity="branch"
				icon={OrganisationIcon}
				title="Branch created"
			/>
		);

		const root = container.firstElementChild;
		expect(root).toHaveClass("mt-2", "flex");
		expect(root).toHaveAttribute("data-activity", "branch");
		expect(ref.current).toBe(root);
	});
});
