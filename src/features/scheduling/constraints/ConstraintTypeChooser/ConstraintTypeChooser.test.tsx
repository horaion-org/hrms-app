import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintTypeChooser } from "@/features/scheduling/constraints/ConstraintTypeChooser";
import { typeGroupsOf } from "@/features/scheduling/constraints/ConstraintDialog/typeGroups";
import { CONSTRAINT_TYPE_OPTIONS } from "@/features/scheduling/constraints/fixtures";
import type { ConstraintTypeOption } from "@/features/scheduling/constraints/api";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const GROUPS = typeGroupsOf(CONSTRAINT_TYPE_OPTIONS);

describe("ConstraintTypeChooser", () => {
	it("given_theApisKinds_when_rendered_then_eachIsACardUnderItsCategoryWithWhatItDoesAndAnExample", () => {
		render(
			<ConstraintTypeChooser groups={GROUPS} value="" onChange={vi.fn()} />
		);

		const staffing = screen.getByRole("radiogroup", {
			name: "People on shifts",
		});
		const card = screen.getByRole("radio", { name: "People on a shift" });
		expect(staffing).toContainElement(card);
		expect(card).toHaveAccessibleDescription(
			/How many people a shift needs, by job title\..*For example/
		);
		expect(screen.getAllByRole("radio")).toHaveLength(
			GROUPS.flatMap((group) => group.types).length
		);
	});

	it("given_aCard_when_chosen_then_saysWhichKind", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ConstraintTypeChooser groups={GROUPS} value="" onChange={onChange} />
		);

		await user.click(
			screen.getByRole("radio", { name: "Rest between shifts" })
		);

		expect(onChange).toHaveBeenCalledWith("REST_BETWEEN_SHIFTS");
	});

	it("given_aKindWithNoWordsOfItsOwn_when_rendered_then_showsItsLabelAlone", () => {
		const unlisted = {
			...CONSTRAINT_TYPE_OPTIONS[0]!,
			type: "SOMETHING_NEW",
		} as unknown as ConstraintTypeOption;
		render(
			<ConstraintTypeChooser
				groups={typeGroupsOf([unlisted])}
				value=""
				onChange={vi.fn()}
			/>
		);

		expect(screen.getByRole("radio")).not.toHaveAccessibleDescription();
	});
});
