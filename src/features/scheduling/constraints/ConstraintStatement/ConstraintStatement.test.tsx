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
	requirement: null,
	values: [{ field: "REST_HOURS" as const, value: "11", name: null }],
};

describe("ConstraintStatement", () => {
	it("puts a Must tag before a fixed must type's sentence, saying what happens when unmet", () => {
		const { container } = render(<ConstraintStatement constraint={REST} />);

		expect(screen.getByText("Must")).toHaveAttribute(
			"title",
			"Always kept. If the people and shifts can't meet it, the schedule shows where it falls short."
		);
		expect(container).toHaveTextContent(
			"Must Everyone gets at least 11 hours off between shifts."
		);
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
							{ field: "PERIOD_DAYS", value: "7", name: null },
						],
					}}
				/>
				<ConstraintStatement
					constraint={{
						type: "AVOID_DAYS_OFF_ON",
						requirement: null,
						values: [{ field: "WEEKDAY", value: "SUN", name: null }],
					}}
				/>
			</>
		);

		expect(screen.getAllByText("If possible")).toHaveLength(2);
		expect(screen.getAllByText("If possible")[0]).toHaveAttribute(
			"title",
			"Kept when it can be. The schedule shows where it wasn't."
		);
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
