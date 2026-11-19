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

	it("given_aClosedFoldableSection_when_rendered_then_itsHeadingIsAButtonSayingTheGistAndItsRowsAreHidden", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		render(
			<ConstraintSection
				count={1}
				description="Who must be on each shift, and how many."
				icon={PeopleIcon}
				title="People on shifts"
				collapse={{
					open: false,
					onToggle,
					gist: "1 constraint · 1 needs attention",
				}}
			>
				<li>Night cover</li>
			</ConstraintSection>
		);

		const heading = screen.getByRole("button", { name: /People on shifts/ });
		expect(heading).toHaveAttribute("aria-expanded", "false");
		expect(heading).toHaveAttribute("aria-controls");
		expect(screen.getByText("1 constraint · 1 needs attention")).toBeVisible();
		expect(screen.queryByRole("listitem")).toBeNull();
		await user.click(heading);
		expect(onToggle).toHaveBeenCalled();
	});

	it("given_anOpenFoldableSection_when_rendered_then_showsItsRowsAndWhatItDecides", () => {
		render(
			<ConstraintSection
				collapse={{ open: true, onToggle: vi.fn(), gist: "1 constraint" }}
				count={1}
				description="Who must be on each shift, and how many."
				icon={PeopleIcon}
				title="People on shifts"
			>
				<li>Night cover</li>
			</ConstraintSection>
		);

		expect(
			screen.getByRole("button", { name: /People on shifts/ })
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("listitem")).toHaveTextContent("Night cover");
		expect(
			screen.getByText("Who must be on each shift, and how many.")
		).toBeVisible();
	});
});
