import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { PeopleIcon, PlaceholderIcon, TimeIcon } from "@/components/ui/Icon";
import {
	categoryIconOf,
	constraintTypeLookOf,
} from "@/features/scheduling/constraints/constraintTypeLooks";
import type { ConstraintType } from "@/features/scheduling/constraints/api";

/** Answers each key with itself, so a test reads which copy was asked for. */
const t = ((key: string) => key) as unknown as TFunction;

describe("constraintTypeLookOf", () => {
	it("given_aKindWithAnEntry_when_looked_then_itsIconLabelDescriptionAndExample", () => {
		expect(constraintTypeLookOf("SHIFT_STAFFING", t)).toEqual({
			Icon: PeopleIcon,
			label: "scheduling.constraints.types.SHIFT_STAFFING",
			description: "scheduling.constraints.descriptions.SHIFT_STAFFING",
			example: "scheduling.constraints.examples.SHIFT_STAFFING",
		});
	});

	it("given_aKindWithNoEntry_when_looked_then_aGenericIconAndItsLabelOnly", () => {
		const unlisted = "SOMETHING_NEW" as ConstraintType;

		expect(constraintTypeLookOf(unlisted, t)).toEqual({
			Icon: PlaceholderIcon,
			label: "scheduling.constraints.types.SOMETHING_NEW",
		});
	});
});

describe("categoryIconOf", () => {
	it("given_aCategory_when_looked_then_itsIcon_orTheGenericOne", () => {
		expect(categoryIconOf("STAFFING")).toBe(PeopleIcon);
		expect(categoryIconOf("WORKING_HOURS")).toBe(TimeIcon);
		expect(categoryIconOf("SOMETHING_NEW" as never)).toBe(PlaceholderIcon);
	});
});
