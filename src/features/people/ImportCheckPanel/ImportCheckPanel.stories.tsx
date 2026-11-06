import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ImportCheckPanel } from "@/features/people/ImportCheckPanel";
import type { ImportCheck } from "@/features/people/import/api";

const values = (
	name: string,
	email: string,
	department: string
): Record<string, string> => ({
	NAME: name,
	EMAIL: email,
	BRANCH: "Orchard",
	DEPARTMENT: department,
	JOB_TITLE: "Security Officer",
});

const check: ImportCheck = {
	totalRows: 4,
	readyRows: 1,
	skippedRows: 1,
	errorRows: 2,
	partialImportAllowed: true,
	noticeRows: 0,
	unknownColumns: ["Salary"],
	invitationsAvailable: false,
	runningImportId: null,
	rows: [
		{
			row: 2,
			status: "READY",
			values: values("Ada Tan", "ada@acme.sg", "Patrol"),
			problems: [],
		},
		{
			row: 3,
			status: "SKIP",
			values: values("Grace Lim", "grace@acme.sg", "Patrol"),
			problems: [{ column: "EMAIL", code: "ALREADY_MEMBER", severity: "SKIP" }],
		},
		{
			row: 4,
			status: "ERROR",
			values: values("Tan Wei Ming", "wm@acme.sg", "Kitchen"),
			problems: [
				{
					column: "DEPARTMENT",
					code: "DEPARTMENT_NOT_FOUND",
					severity: "ERROR",
				},
			],
		},
		{
			row: 5,
			status: "ERROR",
			values: values("Siti Rahmah", "siti@acme.sg", "Kitchen"),
			problems: [
				{
					column: "DEPARTMENT",
					code: "DEPARTMENT_NOT_FOUND",
					severity: "ERROR",
				},
			],
		},
	],
};

const meta = {
	title: "Features/People/ImportCheckPanel",
	component: ImportCheckPanel,
	parameters: { layout: "padded" },
	args: { check, onDownloadErrors: fn(), onUploadAgain: fn() },
} satisfies Meta<typeof ImportCheckPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithErrors: Story = {};

export const Ready: Story = {
	args: {
		check: {
			...check,
			errorRows: 0,
			readyRows: 3,
			rows: check.rows.filter((row) => row.status !== "ERROR"),
		},
	},
};
