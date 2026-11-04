import type {
	OrganisationCheck,
	OrganisationCheckedRow,
	OrganisationImport,
} from "@/features/organisation/import/api";

/** One checked row as the API answers it, for stories and tests; never sent anywhere. */
export const checkedRowFixture = (
	overrides: Partial<OrganisationCheckedRow> &
		Pick<OrganisationCheckedRow, "sheet" | "row">
): OrganisationCheckedRow => ({
	status: "READY",
	values: {},
	problems: [],
	...overrides,
});

/** A check of a clean file with one branch, one department and one job title to create. */
export const checkFixture = (
	overrides: Partial<OrganisationCheck> = {}
): OrganisationCheck => ({
	totalRows: 3,
	readyRows: 3,
	skippedRows: 0,
	errorRows: 0,
	noticeRows: 0,
	unknownColumns: [],
	unknownSheets: [],
	runningImportId: null,
	toCreate: { branches: 1, departments: 1, jobTitles: 1 },
	alreadyExist: { branches: 0, departments: 0, jobTitles: 0 },
	headedByYou: { branches: 1, departments: 1 },
	rows: [
		checkedRowFixture({
			sheet: "BRANCHES",
			row: 3,
			values: {
				CODE: "JUR",
				NAME: "Jurong",
				CITY: "Singapore",
				COUNTRY: "SG",
				TIME_ZONE: "Asia/Singapore",
				HEADS: "",
			},
		}),
		checkedRowFixture({
			sheet: "DEPARTMENTS",
			row: 3,
			values: { BRANCH: "JUR", NAME: "Patrol", HEADS: "" },
		}),
		checkedRowFixture({
			sheet: "JOB_TITLES",
			row: 3,
			values: {
				BRANCH: "JUR",
				DEPARTMENT: "Patrol",
				NAME: "Security Officer",
				DESCRIPTION: "",
			},
		}),
	],
	...overrides,
});

/** A finished import of `checkFixture`'s file. */
export const organisationImportFixture = (
	overrides: Partial<OrganisationImport> = {}
): OrganisationImport => ({
	importId: "o-1",
	status: "COMPLETED",
	requestedBy: "Moses Lee",
	createdAt: "2026-11-04T02:42:00Z",
	finishedAt: "2026-11-04T02:42:01Z",
	totalRows: 3,
	createdRows: 3,
	skippedRows: 0,
	created: { branches: 1, departments: 1, jobTitles: 1 },
	skipped: { branches: 0, departments: 0, jobTitles: 0 },
	rows: [
		{ sheet: "BRANCHES", rowNumber: 3, result: "CREATED", unitId: "b-9" },
		{ sheet: "DEPARTMENTS", rowNumber: 3, result: "CREATED", unitId: "d-9" },
		{ sheet: "JOB_TITLES", rowNumber: 3, result: "CREATED", unitId: "j-9" },
	],
	...overrides,
});
