import i18n from "i18next";
import { describe, expect, it } from "vitest";
import "@/common/i18n";
import { bulkSummary } from "@/features/employmentTerms/bulkSummary";

const t = i18n.getFixedT("en");
const terms = { name: "Five-day week, 44 h", date: "9 Nov 2026" };

describe("bulkSummary", () => {
	it("tells skips apart by the API's reason", () => {
		expect(
			bulkSummary(
				{
					moved: 9,
					unchanged: 1,
					skipped: [
						{ membershipId: "m-1", reason: "NOT_FOUND_OR_NO_PERMISSION" },
						{ membershipId: "m-2", reason: "CHANGE_EXISTS" },
						{ membershipId: "m-3", reason: "NOT_FOUND_OR_NO_PERMISSION" },
						{ membershipId: "m-4", reason: "SOMETHING_NEW" },
					],
					skippedByReason: {
						NOT_FOUND_OR_NO_PERMISSION: 2,
						CHANGE_EXISTS: 1,
						SOMETHING_NEW: 1,
					},
				},
				terms,
				t
			)
		).toBe(
			"Moved 9 people to Five-day week, 44 h from 9 Nov 2026, 1 already had them, 2 skipped because they’re no longer here or you can’t change their terms, 1 skipped because they already have a change on that date, 1 skipped."
		);
	});

	it("counts from the list when an older API sends no counts", () => {
		expect(
			bulkSummary(
				{
					moved: 0,
					unchanged: 0,
					skipped: [{ membershipId: "m-1", reason: "BEFORE_FIRST_ENTRY" }],
					skippedByReason: {},
				},
				terms,
				t
			)
		).toBe(
			"Moved 0 people to Five-day week, 44 h from 9 Nov 2026, 1 skipped because that date is before their first terms."
		);
	});

	it("says only what was moved when nothing else happened", () => {
		expect(
			bulkSummary(
				{ moved: 1, unchanged: 0, skipped: [], skippedByReason: {} },
				terms,
				t
			)
		).toBe("Moved 1 person to Five-day week, 44 h from 9 Nov 2026.");
	});
});
