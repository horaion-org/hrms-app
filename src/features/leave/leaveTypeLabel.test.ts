import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { leaveFixture } from "@/features/leave/fixtures";
import { leaveTypeLabel } from "@/features/leave/leaveTypeLabel";

let t: TFunction;
beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

describe("leaveTypeLabel", () => {
	it("uses the company's own name when the API sends one", () => {
		const request = leaveFixture({
			leaveRequestId: "r-1",
			leaveType: "STUDY_LEAVE",
			leaveTypeName: "Study leave",
		});
		expect(leaveTypeLabel(request, t)).toBe("Study leave");
	});

	it("names a code of the old fixed list when the API sends no name", () => {
		const request = leaveFixture({
			leaveRequestId: "r-2",
			leaveType: "SICK",
			leaveTypeName: null,
		});
		expect(leaveTypeLabel(request, t)).toBe("Sick leave");
	});

	it("falls back to a generic label for a code it has never seen", () => {
		const request = leaveFixture({
			leaveRequestId: "r-3",
			leaveType: "SOMETHING_NEW",
			leaveTypeName: null,
		});
		expect(leaveTypeLabel(request, t)).toBe("Leave");
	});
});
