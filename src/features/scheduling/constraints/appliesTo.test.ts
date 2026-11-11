import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { appliesToOf } from "@/features/scheduling/constraints/appliesTo";

let t: TFunction;

beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

const shift = (name: string): { field: "SHIFT"; name: string } => ({
	field: "SHIFT",
	name,
});

describe("appliesToOf", () => {
	it("reads a company constraint as the whole company", () => {
		expect(
			appliesToOf(
				{ type: "REST_BETWEEN_SHIFTS", level: "COMPANY", values: [] },
				t
			)
		).toBe("Whole company");
	});

	it("names the one shift a shift type counts", () => {
		expect(
			appliesToOf(
				{
					type: "SHIFT_STAFFING",
					level: "DEPARTMENT",
					values: [shift("Front desk AM")],
				},
				t
			)
		).toBe("Front desk AM");
	});

	it("names several shifts joined with and", () => {
		expect(
			appliesToOf(
				{
					type: "ROLE_PRESENCE",
					level: "DEPARTMENT",
					values: [shift("Opening"), shift("Closing")],
				},
				t
			)
		).toBe("Opening and Closing");
	});

	it("says nothing for a shift type with no shift yet", () => {
		expect(
			appliesToOf(
				{ type: "SHIFT_STAFFING", level: "DEPARTMENT", values: [] },
				t
			)
		).toBeUndefined();
	});

	it("reads any other department constraint as everyone rostered in its department", () => {
		expect(
			appliesToOf(
				{
					type: "DAYS_OFF_PER_PERIOD",
					level: "DEPARTMENT",
					departmentName: "Sales",
					values: [],
				},
				t
			)
		).toBe("Everyone rostered in Sales");
	});

	it("says nothing where the department is not named", () => {
		expect(
			appliesToOf(
				{ type: "AVOID_DAYS_OFF_ON", level: "DEPARTMENT", values: [] },
				t
			)
		).toBeUndefined();
	});
});
