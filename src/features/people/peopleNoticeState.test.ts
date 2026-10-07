import { describe, expect, it } from "vitest";
import {
	peopleNoticeFrom,
	withPeopleNotice,
} from "@/features/people/peopleNoticeState";

describe("people notice", () => {
	it("round-trips through history state and keeps the rest", () => {
		const state = withPeopleNotice({
			kind: "added",
			name: "Priya Nair",
			roleNotAssigned: true,
		})({ __tempKey: "k1" });
		expect(state).toEqual({
			__tempKey: "k1",
			peopleNotice: {
				kind: "added",
				name: "Priya Nair",
				roleNotAssigned: true,
			},
		});
		expect(peopleNoticeFrom(state)).toEqual({
			kind: "added",
			name: "Priya Nair",
			roleNotAssigned: true,
		});
	});

	it("carries skills that weren't saved", () => {
		const notice = {
			kind: "saved",
			name: "Priya Nair",
			roleNotAssigned: false,
			skillsNotSaved: true,
		} as const;
		expect(peopleNoticeFrom(withPeopleNotice(notice)({}))).toEqual(notice);
	});

	it.each([
		undefined,
		null,
		{},
		{ peopleNotice: { kind: "added", name: "", roleNotAssigned: false } },
		{
			peopleNotice: { kind: "deleted", name: "Priya", roleNotAssigned: false },
		},
		"Priya",
	])("reads %j as no notice", (state) => {
		expect(peopleNoticeFrom(state)).toBeUndefined();
	});
});
