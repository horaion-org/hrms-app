import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { JobTitle } from "@/features/organisation/api";
import { jobTitleStatusCopy } from "@/features/organisation/jobTitleStatusCopy";

let t: TFunction;

beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

/** An active Clerk title in the front office, held by `holderCount` people. */
const jobTitle = (overrides: Partial<JobTitle> = {}): JobTitle => ({
	jobTitleId: "jt-1",
	branchId: "b-1",
	branchName: "Main branch",
	departmentId: "d-1",
	departmentName: "Front office",
	name: "Clerk",
	description: null,
	status: "ACTIVE",
	holderCount: 0,
	...overrides,
});

const key = "organisation.jobTitles.status";

describe("jobTitleStatusCopy", () => {
	it("asks to activate an inactive title", () => {
		expect(jobTitleStatusCopy(jobTitle({ status: "INACTIVE" }), t)).toEqual({
			title: t(`${key}.activateTitle`, { name: "Clerk" }),
			description: t(`${key}.activateDescription`),
			confirmLabel: t(`${key}.activateConfirm`),
		});
	});

	it("names how many keep a title people hold when it is deactivated", () => {
		expect(jobTitleStatusCopy(jobTitle({ holderCount: 3 }), t)).toEqual({
			title: t(`${key}.deactivateTitle`, { name: "Clerk" }),
			description: t(`${key}.deactivateDescriptionHeld`, { count: 3 }),
			confirmLabel: t(`${key}.deactivateConfirmHeld`, { count: 3 }),
		});
	});

	it("adds how many rules name the title, once that is known and above zero", () => {
		const plain = t(`${key}.deactivateDescription`);

		expect(jobTitleStatusCopy(jobTitle(), t, 2).description).toBe(
			`${plain} ${t(`${key}.namedByConstraints`, { count: 2 })}`
		);
		expect(jobTitleStatusCopy(jobTitle(), t, 0).description).toBe(plain);
		expect(jobTitleStatusCopy(jobTitle(), t).description).toBe(plain);
	});
});
