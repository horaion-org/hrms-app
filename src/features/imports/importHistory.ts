import type { TFunction } from "i18next";
import type { OrganisationImport } from "@/features/organisation/import/api";
import type { MemberImport } from "@/features/people/import/api";

/** One line of Import history: an import of either kind. */
export type ImportHistoryEntry =
	| { kind: "ORGANISATION"; importRecord: OrganisationImport }
	| { kind: "PEOPLE"; importRecord: MemberImport };

/** Both kinds of import in one list, newest first. */
export const mergeImportHistory = (
	organisationImports: ReadonlyArray<OrganisationImport>,
	peopleImports: ReadonlyArray<MemberImport>
): Array<ImportHistoryEntry> =>
	[
		...organisationImports.map((importRecord): ImportHistoryEntry => ({
			kind: "ORGANISATION",
			importRecord,
		})),
		...peopleImports.map((importRecord): ImportHistoryEntry => ({
			kind: "PEOPLE",
			importRecord,
		})),
	].sort(
		(first, second) =>
			Date.parse(second.importRecord.createdAt) -
			Date.parse(first.importRecord.createdAt)
	);

/** How an import ended, in a few words: counts once finished, its state while running. */
export const historyResultText = (
	entry: ImportHistoryEntry,
	t: TFunction
): string => {
	if (entry.kind === "ORGANISATION")
		return t("settings.data.history.organisationResult", {
			created: entry.importRecord.createdRows,
			skipped: entry.importRecord.skippedRows,
		});
	const { status, addedRows, failedRows } = entry.importRecord;
	if (status === "QUEUED" || status === "RUNNING")
		return t(`people.importPage.recent.status.${status}`);
	const counts = t("settings.data.history.peopleResult", {
		added: addedRows,
		failed: failedRows,
	});
	return status === "FAILED"
		? `${t("people.importPage.recent.status.FAILED")} · ${counts}`
		: counts;
};
