import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { organisationImportFixture } from "@/features/organisation/import/fixtures";
import type { MemberImport } from "@/features/people/import/api";
import {
	historyResultText,
	mergeImportHistory,
} from "@/features/imports/importHistory";

const t = authTestI18n.t as TFunction;

const peopleImport = (overrides: Partial<MemberImport>): MemberImport => ({
	importId: "p-1",
	status: "COMPLETED",
	requestedBy: "Moses Lee",
	sendInvitations: false,
	totalRows: 48,
	processedRows: 48,
	addedRows: 45,
	invitePendingRows: 0,
	skippedRows: 0,
	skippedInvalidRows: 0,
	failedRows: 3,
	resolvedRows: 0,
	createdAt: "2026-11-04T03:05:00Z",
	finishedAt: "2026-11-04T03:07:00Z",
	rows: [],
	...overrides,
});

describe("mergeImportHistory", () => {
	it("lists both kinds together, newest first", () => {
		const merged = mergeImportHistory(
			[
				organisationImportFixture({
					importId: "o-old",
					createdAt: "2026-11-01T00:00:00Z",
				}),
				organisationImportFixture({
					importId: "o-new",
					createdAt: "2026-11-04T09:00:00Z",
				}),
			],
			[peopleImport({ importId: "p-mid", createdAt: "2026-11-02T00:00:00Z" })]
		);

		expect(
			merged.map((entry) => [entry.kind, entry.importRecord.importId])
		).toEqual([
			["ORGANISATION", "o-new"],
			["PEOPLE", "p-mid"],
			["ORGANISATION", "o-old"],
		]);
	});

	it("is empty when neither kind has imports", () => {
		expect(mergeImportHistory([], [])).toEqual([]);
	});
});

describe("historyResultText", () => {
	it("counts what an organisation import created and skipped", () => {
		expect(
			historyResultText(
				{
					kind: "ORGANISATION",
					importRecord: organisationImportFixture({
						createdRows: 58,
						skippedRows: 3,
					}),
				},
				t
			)
		).toBe("58 created · 3 skipped");
	});

	it("counts a people import whose status this build does not know, like a finished one", () => {
		expect(
			historyResultText(
				{ kind: "PEOPLE", importRecord: peopleImport({ status: "UNKNOWN" }) },
				t
			)
		).toBe(
			historyResultText(
				{ kind: "PEOPLE", importRecord: peopleImport({ status: "COMPLETED" }) },
				t
			)
		);
	});

	it("counts a finished people import, says a running one is running, and marks a stopped one", () => {
		expect(
			historyResultText({ kind: "PEOPLE", importRecord: peopleImport({}) }, t)
		).toBe("45 added · 3 failed");
		expect(
			historyResultText(
				{ kind: "PEOPLE", importRecord: peopleImport({ status: "RUNNING" }) },
				t
			)
		).toBe("Running");
		expect(
			historyResultText(
				{ kind: "PEOPLE", importRecord: peopleImport({ status: "FAILED" }) },
				t
			)
		).toBe("Stopped · 45 added · 3 failed");
	});
});
