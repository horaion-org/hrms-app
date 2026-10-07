import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DescriptionList } from "@/components/ui/DescriptionList";

describe("DescriptionList", () => {
	it("pairs each label with its value, in order", () => {
		const { container } = render(
			<DescriptionList
				items={[
					{ label: "Full name", value: "Kent Chua" },
					{ label: "Employee ID", value: <strong>EMP-10392</strong> },
				]}
			/>
		);

		const terms = screen.getAllByRole("term");
		const definitions = screen.getAllByRole("definition");
		expect(terms.map((term) => term.textContent)).toEqual([
			"Full name",
			"Employee ID",
		]);
		expect(definitions.map((value) => value.textContent)).toEqual([
			"Kent Chua",
			"EMP-10392",
		]);
		expect(terms[0]?.nextElementSibling).toBe(definitions[0]);
		expect(container.querySelector("dl")).toContainElement(
			within(definitions[1] as HTMLElement).getByText("EMP-10392")
		);
	});

	it("sizes the value column as asked, half the row by default", () => {
		const { rerender } = render(
			<DescriptionList items={[{ label: "Hire date", value: "15 Jan 2024" }]} />
		);
		expect(screen.getByRole("definition")).toHaveClass("sm:w-1/2");

		rerender(
			<DescriptionList
				items={[{ label: "Hire date", value: "15 Jan 2024" }]}
				valueWidth="sm:w-[52.5%]"
			/>
		);
		expect(screen.getByRole("definition")).toHaveClass("sm:w-[52.5%]");
		expect(screen.getByRole("definition")).not.toHaveClass("sm:w-1/2");
	});
});
