import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { OrganisationCheckPanel } from "@/features/organisation/OrganisationCheckPanel";
import type { OrganisationCheck } from "@/features/organisation/import/api";

const check: OrganisationCheck = {
	totalRows: 4,
	readyRows: 2,
	skippedRows: 0,
	errorRows: 2,
	noticeRows: 0,
	unknownColumns: ["Branches › Notes"],
	unknownSheets: [],
	runningImportId: null,
	toCreate: { branches: 1, departments: 1, jobTitles: 0 },
	alreadyExist: { branches: 0, departments: 0, jobTitles: 0 },
	headedByYou: { branches: 1, departments: 0 },
	rows: [
		{
			sheet: "BRANCHES",
			row: 2,
			status: "READY",
			values: {
				CODE: "JUR",
				NAME: "Jurong",
				CITY: "Singapore",
				COUNTRY: "SG",
				TIME_ZONE: "Asia/Singapore",
				HEADS: "",
			},
			problems: [],
		},
		{
			sheet: "DEPARTMENTS",
			row: 2,
			status: "READY",
			values: { BRANCH: "JUR", NAME: "Control", HEADS: "" },
			problems: [],
		},
		{
			sheet: "DEPARTMENTS",
			row: 3,
			status: "ERROR",
			values: { BRANCH: "JUR", NAME: "Patrol", HEADS: "lim@acme.sg" },
			problems: [
				{ column: "HEADS", code: "HEAD_NOT_MEMBER", severity: "ERROR" },
			],
		},
		{
			sheet: "JOB_TITLES",
			row: 2,
			status: "ERROR",
			values: {
				BRANCH: "TMP",
				DEPARTMENT: "Control",
				NAME: "Senior Officer",
				DESCRIPTION: "",
			},
			problems: [
				{ column: "BRANCH", code: "BRANCH_NOT_FOUND", severity: "ERROR" },
			],
		},
	],
};

const meta = {
	title: "Features/Organisation/OrganisationCheckPanel",
	component: OrganisationCheckPanel,
	parameters: { layout: "padded" },
	args: { check, onDownloadErrors: fn(), onUploadAgain: fn() },
} satisfies Meta<typeof OrganisationCheckPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithErrors: Story = {};

export const Ready: Story = {
	args: {
		check: {
			...check,
			errorRows: 0,
			readyRows: 3,
			toCreate: { branches: 1, departments: 2, jobTitles: 0 },
			alreadyExist: { branches: 1, departments: 0, jobTitles: 0 },
			rows: check.rows
				.filter((row) => row.sheet !== "JOB_TITLES")
				.map((row) => ({ ...row, status: "READY", problems: [] })),
		},
	},
};
