import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PeopleIcon } from "@/components/ui/Icon";
import { ConstraintSection } from "@/features/scheduling/constraints/ConstraintSection";

describe("ConstraintSection", () => {
	it("given_rows_when_rendered_then_aNamedSectionWithItsCountWhatItDecidesAndItsAdd", async () => {
		const user = userEvent.setup();
		const onAdd = vi.fn();
		render(
			<ConstraintSection
				add={{ label: "Add", onAdd }}
				count={1}
				description="Who must be on each shift, and how many."
				icon={PeopleIcon}
				title="People on shifts"
			>
				<li>Night cover</li>
			</ConstraintSection>
		);

		const section = screen.getByRole("region", {
			name: "People on shifts · 1",
		});
		expect(section).toHaveTextContent(
			"Who must be on each shift, and how many."
		);
		expect(screen.getByRole("listitem")).toHaveTextContent("Night cover");
		await user.click(screen.getByRole("button", { name: "Add" }));
		expect(onAdd).toHaveBeenCalled();
	});

	it("given_noRows_when_rendered_then_saysTheEmptyLine", () => {
		render(
			<ConstraintSection
				count={0}
				description="Limits on hours."
				emptyText="None of its own. The company's limits apply."
				icon={PeopleIcon}
				title="Rest and hours"
			/>
		);

		expect(
			screen.getByText("None of its own. The company's limits apply.")
		).toBeVisible();
	});

	it("given_folded_when_rendered_then_saysTheSummaryUntilOpened", async () => {
		const user = userEvent.setup();
		render(
			<ConstraintSection
				count={1}
				description="From the work policy."
				icon={PeopleIcon}
				title="Set by the company"
				folded={{
					summary: "1 company constraint applies here.",
					showLabel: "Show all 1",
					hideLabel: "Hide",
				}}
			>
				<li>Company rest</li>
			</ConstraintSection>
		);

		expect(
			screen.getByText("1 company constraint applies here.")
		).toBeVisible();
		expect(screen.queryByRole("listitem")).toBeNull();
		await user.click(screen.getByRole("button", { name: "Show all 1" }));

		expect(screen.getByRole("listitem")).toHaveTextContent("Company rest");
		expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute(
			"aria-expanded",
			"true"
		);
	});
});
