import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
	CrossIcon,
	PeopleIcon,
	PlaceholderIcon,
	TimeIcon,
} from "@/components/ui/Icon";
import {
	categoryIconOf,
	constraintTypeLookOf,
} from "@/features/scheduling/constraints/constraintTypeLooks";
import type { ConstraintType } from "@/features/scheduling/constraints/api";
import { authTestI18n } from "@/features/auth/testingI18n";

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

	it("given_aBannedShiftPattern_when_looked_then_theNotAllowedIconWithItsWords", () => {
		expect(constraintTypeLookOf("BANNED_SHIFT_PATTERN", t)).toEqual({
			Icon: CrossIcon,
			label: "scheduling.constraints.types.BANNED_SHIFT_PATTERN",
			description: "scheduling.constraints.descriptions.BANNED_SHIFT_PATTERN",
			example: "scheduling.constraints.examples.BANNED_SHIFT_PATTERN",
		});
	});

	it("given_overtimeStretch_when_described_then_saysWhichRostersItAppliesTo", () => {
		expect(
			constraintTypeLookOf("OVERTIME_STRETCH", authTestI18n.t).description
		).toMatch(
			/Used only when you ask the engine in Find cover, never when a roster is generated\. It applies to rosters generated after it is added; regenerate an existing roster to use it\.$/
		);
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
