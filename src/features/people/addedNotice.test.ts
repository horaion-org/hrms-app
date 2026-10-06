import { describe, expect, it } from "vitest";
import {
	addedNoticeFrom,
	withAddedNotice,
} from "@/features/people/addedNotice";

describe("added notice", () => {
	it("round-trips through history state and keeps the rest", () => {
		const state = withAddedNotice({
			name: "Priya Nair",
			roleNotAssigned: true,
		})({ __tempKey: "k1" });
		expect(state).toEqual({
			__tempKey: "k1",
			addedEmployee: { name: "Priya Nair", roleNotAssigned: true },
		});
		expect(addedNoticeFrom(state)).toEqual({
			name: "Priya Nair",
			roleNotAssigned: true,
		});
	});

	it.each([undefined, null, {}, { addedEmployee: { name: "" } }, "Priya"])(
		"reads %j as no notice",
		(state) => {
			expect(addedNoticeFrom(state)).toBeUndefined();
		}
	);
});
