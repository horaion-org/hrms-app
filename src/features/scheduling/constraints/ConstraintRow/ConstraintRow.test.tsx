import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintRow } from "@/features/scheduling/constraints/ConstraintRow";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
	CONSTRAINT_TYPE_OPTIONS,
} from "@/features/scheduling/constraints/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const own = CONSTRAINT_FIXTURES[0]!;
const companyRest = COMPANY_CONSTRAINT_FIXTURES[0]!;

/** Renders one row inside the list a ConstraintSection gives it. */
const renderRow = (row: React.ReactElement): void => {
	render(<ul>{row}</ul>);
};

describe("ConstraintRow", () => {
	it("given_aDepartmentConstraint_when_rendered_then_readsAsItsSentenceThenItsName_withEditAndDelete", async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();
		renderRow(
			<ConstraintRow
				constraint={own}
				needsAttention={false}
				types={CONSTRAINT_TYPE_OPTIONS}
				onDelete={vi.fn()}
				onEdit={onEdit}
			/>
		);

		expect(screen.getByRole("listitem")).toHaveTextContent(own.name);
		expect(screen.queryByText("Needs attention")).toBeNull();
		await user.click(screen.getByRole("button", { name: `Edit ${own.name}` }));
		expect(onEdit).toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: `Delete ${own.name}` })
		).toBeVisible();
	});

	it("given_aConstraintThatNeedsAttention_when_rendered_then_saysSoWhyAndOffersFix", async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();
		renderRow(
			<ConstraintRow
				needsAttention
				capacity={{
					headcount: 3,
					peopleWithTitles: 2,
					jobTitleNames: ["Supervisor"],
				}}
				constraint={own}
				types={CONSTRAINT_TYPE_OPTIONS}
				onEdit={onEdit}
			/>
		);

		expect(screen.getByText("Needs attention")).toBeVisible();
		expect(
			screen.getByText(
				"Only 2 people hold Supervisor, but it asks for 3, so it can never be met."
			)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: `Fix ${own.name}` }));
		expect(onEdit).toHaveBeenCalled();
	});

	it("given_aLockedCompanyConstraint_when_rendered_then_saysItAlwaysAppliesAndOffersMakeStricter", async () => {
		const user = userEvent.setup();
		const onReplace = vi.fn();
		renderRow(
			<ConstraintRow
				constraint={companyRest}
				needsAttention={false}
				types={CONSTRAINT_TYPE_OPTIONS}
				onReplace={onReplace}
			/>
		);

		expect(screen.getByRole("listitem")).toHaveTextContent("Always applies");
		await user.click(
			screen.getByRole("button", { name: "Make Company rest stricter here" })
		);
		expect(onReplace).toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: /^Edit/ })).toBeNull();
	});

	it("given_aSwitchedOffConstraint_when_rendered_then_saysInactive", () => {
		renderRow(
			<ConstraintRow
				constraint={{ ...own, status: "INACTIVE" }}
				needsAttention={false}
				types={CONSTRAINT_TYPE_OPTIONS}
			/>
		);

		expect(screen.getByText("Inactive")).toBeVisible();
	});
});
