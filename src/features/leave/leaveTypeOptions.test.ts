import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	LEAVE_TYPE_FIXTURES,
	leaveTypeFixture,
} from "@/features/leave/fixtures";
import { leaveTypeOptions } from "@/features/leave/leaveTypeOptions";

let t: TFunction;
beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

describe("leaveTypeOptions", () => {
	it("groups the default catalogue by kind and leaves out the scheduler's day off", () => {
		const options = leaveTypeOptions(LEAVE_TYPE_FIXTURES, t);
		expect(options.map((option) => option.value)).not.toContain("OFF");
		expect(options.slice(0, 2)).toEqual([
			{ value: "ANNUAL", label: "Annual leave", group: "Yearly allowance" },
			{ value: "SICK", label: "Sick leave", group: "Yearly allowance" },
		]);
		expect(
			options.filter((option) => option.group === "Per occasion")
		).toHaveLength(5);
		expect(options[options.length - 1]).toEqual({
			value: "OTHER",
			label: "Other",
			group: "No allowance",
		});
	});

	it("orders by kind, then by the company's order, whatever order it receives", () => {
		const options = leaveTypeOptions(
			[
				leaveTypeFixture({
					code: "UNPAID",
					name: "Unpaid",
					grantKind: "UNTRACKED",
				}),
				leaveTypeFixture({
					code: "STUDY",
					name: "Study",
					grantKind: "ALLOWANCE",
					displayOrder: 2,
				}),
				leaveTypeFixture({
					code: "ANNUAL",
					name: "Annual",
					grantKind: "ALLOWANCE",
				}),
			],
			t
		);
		expect(options.map((option) => option.value)).toEqual([
			"ANNUAL",
			"STUDY",
			"UNPAID",
		]);
	});

	it("leaves out inactive types", () => {
		const options = leaveTypeOptions(
			[
				leaveTypeFixture({
					code: "ANNUAL",
					name: "Annual",
					grantKind: "ALLOWANCE",
				}),
				leaveTypeFixture({
					code: "OLD",
					name: "Old",
					grantKind: "ALLOWANCE",
					status: "INACTIVE",
				}),
			],
			t
		);
		expect(options.map((option) => option.value)).toEqual(["ANNUAL"]);
	});

	it("shows no headings when every type is of one kind", () => {
		const options = leaveTypeOptions(
			[
				leaveTypeFixture({
					code: "ANNUAL",
					name: "Annual",
					grantKind: "ALLOWANCE",
				}),
				leaveTypeFixture({
					code: "SICK",
					name: "Sick",
					grantKind: "ALLOWANCE",
				}),
			],
			t
		);
		expect(options.every((option) => option.group === undefined)).toBe(true);
	});

	it("lists a kind it does not know last, without a heading", () => {
		const options = leaveTypeOptions(
			[
				leaveTypeFixture({
					code: "TOIL",
					name: "Time off in lieu",
					grantKind: "EARNED",
				}),
				leaveTypeFixture({
					code: "ANNUAL",
					name: "Annual",
					grantKind: "ALLOWANCE",
				}),
			],
			t
		);
		expect(options).toEqual([
			{ value: "ANNUAL", label: "Annual", group: "Yearly allowance" },
			{ value: "TOIL", label: "Time off in lieu" },
		]);
	});
});
