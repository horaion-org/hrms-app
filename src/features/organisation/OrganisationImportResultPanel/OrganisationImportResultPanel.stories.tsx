import type { Meta, StoryObj } from "@storybook/react-vite";
import { OrganisationImportResultPanel } from "@/features/organisation/OrganisationImportResultPanel";
import type { OrganisationImport } from "@/features/organisation/import/api";

const finished: OrganisationImport = {
	importId: "o-1",
	status: "COMPLETED",
	requestedBy: "Moses Lee",
	createdAt: "2026-11-04T02:42:00Z",
	finishedAt: "2026-11-04T02:42:01Z",
	totalRows: 5,
	createdRows: 3,
	skippedRows: 2,
	created: { branches: 1, departments: 1, jobTitles: 1 },
	skipped: { branches: 1, departments: 0, jobTitles: 0 },
	rows: [
		{
			sheet: "BRANCHES",
			rowNumber: 2,
			result: "SKIPPED_EXAMPLE",
			unitId: null,
		},
		{ sheet: "BRANCHES", rowNumber: 3, result: "CREATED", unitId: "b-1" },
		{
			sheet: "BRANCHES",
			rowNumber: 4,
			result: "SKIPPED_EXISTS",
			unitId: "b-0",
		},
		{ sheet: "DEPARTMENTS", rowNumber: 2, result: "CREATED", unitId: "d-1" },
		{ sheet: "JOB_TITLES", rowNumber: 2, result: "CREATED", unitId: "j-1" },
	],
};

const meta = {
	title: "Features/Organisation/OrganisationImportResultPanel",
	component: OrganisationImportResultPanel,
	parameters: { layout: "padded" },
	args: { organisationImport: finished },
} satisfies Meta<typeof OrganisationImportResultPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Finished: Story = {};

export const NothingCreated: Story = {
	args: {
		organisationImport: {
			...finished,
			createdRows: 0,
			skippedRows: 5,
			created: { branches: 0, departments: 0, jobTitles: 0 },
			rows: finished.rows.map((row) => ({ ...row, result: "SKIPPED_EXISTS" })),
		},
	},
};
