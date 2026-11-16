import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintStatement } from "@/features/scheduling/constraints/ConstraintStatement";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const REST = {
	type: "REST_BETWEEN_SHIFTS" as const,
	requirement: "MUST" as const,
	values: [{ field: "REST_HOURS" as const, value: "11", name: null }],
};

describe("ConstraintStatement", () => {
	it("puts a Must tag before a must rule's sentence, saying what happens when unmet", () => {
		const { container } = render(<ConstraintStatement constraint={REST} />);

		expect(screen.getByText("Must")).toHaveAttribute(
			"title",
			"Always kept. If the people and shifts can't meet it, the schedule shows where it falls short."
		);
		expect(container).toHaveTextContent(
			"Must Everyone gets at least 11 hours off between shifts."
		);
		expect(screen.getByText("Must")).toHaveClass("bg-neutral-400");
	});

	it("puts no tag before a setting, which is neither a Must nor an If possible", () => {
		const { container } = render(
			<ConstraintStatement
				constraint={{
					type: "MAX_CALL_BACKS_PER_PERSON",
					requirement: null,
					values: [{ field: "CALL_BACKS", value: "2", name: null }],
				}}
			/>
		);

		expect(screen.queryByText("Must")).toBeNull();
		expect(container).toHaveTextContent(
			"Everyone may be called back to work on a rest or off day at most 2 times in a roster."
		);
	});

	it("tags rest between shifts chosen as a Should as If possible", () => {
		render(
			<ConstraintStatement constraint={{ ...REST, requirement: "SHOULD" }} />
		);

		expect(screen.getByText("If possible")).toBeVisible();
	});

	it("tags a chosen Should as If possible, and an always-should type too", () => {
		render(
			<>
				<ConstraintStatement
					constraint={{
						type: "DAYS_OFF_PER_PERIOD",
						requirement: "SHOULD",
						values: [
							{ field: "DAYS_OFF", value: "2", name: null },
							{ field: "PERIOD_WEEKS", value: "1", name: null },
						],
					}}
				/>
				<ConstraintStatement
					constraint={{
						type: "AVOID_DAYS_OFF_ON",
						requirement: null,
						requirementPolicy: "ALWAYS_SHOULD",
						values: [{ field: "WEEKDAY", value: "SUN", name: null }],
					}}
				/>
			</>
		);

		expect(screen.getAllByText("If possible")).toHaveLength(2);
		for (const tag of screen.getAllByText("If possible"))
			expect(tag).toHaveClass("bg-warning-100");
		expect(screen.getAllByText("If possible")[0]).toHaveAttribute(
			"title",
			"Kept when it can be. The schedule shows where it wasn't."
		);
	});

	it("marks a field holding a value that no longer fits, and says what to do under the sentence", () => {
		render(
			<ConstraintStatement
				constraint={{
					type: "SHIFT_STAFFING",
					requirement: "MUST",
					values: [
						{ field: "COMPARISON", value: "AT_LEAST", name: null },
						{ field: "HEADCOUNT", value: "2", name: null },
						{
							field: "JOB_TITLE",
							value: "lead",
							name: "Lead",
							problem: "NOT_LISTED",
						},
						{ field: "SHIFT", value: "closing", name: "Closing" },
					],
				}}
			/>
		);

		expect(screen.getByText("Lead")).toHaveClass("text-warning-700");
		expect(screen.getByText("Closing")).not.toHaveClass("text-warning-700");
		expect(
			screen.getByText(
				"Lead isn’t on every one of the constraint’s shifts any more. Edit the constraint, or add Lead to each of its shifts."
			)
		).toBeVisible();
	});

	it("shows who it applies to under the sentence only when given", () => {
		const { rerender } = render(
			<ConstraintStatement appliesTo="Whole company" constraint={REST} />
		);
		expect(screen.getByText("Whole company")).toHaveClass("text-xs");

		rerender(<ConstraintStatement constraint={REST} />);
		expect(screen.queryByText("Whole company")).toBeNull();
	});

	it("shows grey words for what is not chosen yet only while being filled in", () => {
		const empty = {
			type: "SHIFT_STAFFING" as const,
			requirement: null,
			values: [],
		};
		const { container, rerender } = render(
			<ConstraintStatement placeholders constraint={empty} />
		);

		expect(container).toHaveTextContent(
			"Must or if possible which shift needs at least how many people as which job titles."
		);
		expect(screen.getByText("which shift")).toHaveClass("text-neutral-600");

		rerender(<ConstraintStatement constraint={empty} />);
		expect(screen.queryByText("which shift")).toBeNull();
		expect(screen.queryByText("Must or if possible")).toBeNull();
	});
});
