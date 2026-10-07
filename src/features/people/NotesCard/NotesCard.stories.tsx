import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { NotesCard } from "@/features/people/NotesCard";
import { storyCompany } from "@/features/people/storyCompany";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const note = (
	noteId: string,
	body: string,
	displayName: string | null,
	createdAt: string,
	edited = false
): unknown => ({
	noteId,
	body,
	author: { membershipId: `a-${noteId}`, displayName },
	createdAt,
	updatedAt: createdAt,
	edited,
});

const meta = {
	title: "Features/People/NotesCard",
	component: NotesCard,
	parameters: {
		layout: "padded",
		permissions: [
			"member_note:read",
			"member_note:create",
			"member_note:update",
			"member_note:delete",
		],
	},
	args: {
		companyId: COMPANY,
		actions: "menu",
		className: "max-w-xl",
		profile: {
			membershipId: "m-1",
			employeeCode: "EMP-10392",
			displayName: "Kent Chua",
			email: "kent.chua@company.com",
			phone: null,
			branchId: "b-1",
			branchName: "Orchard",
			departmentId: "d-1",
			departmentName: "Food & Beverage",
			jobTitleId: null,
			jobTitleName: null,
			status: "ACTIVE",
			dateOfBirth: null,
			employmentType: null,
			hireDate: null,
			probationEndDate: null,
			endDate: null,
			reportsTo: null,
		},
	},
	decorators: [storyCompany(client, COMPANY), storyProviders(client)],
	beforeEach: (): (() => void) =>
		stubStoryApi(
			[
				{
					path: "/notes",
					content: [
						note(
							"n-1",
							"Reliable and punctual. Shows great attention to detail in bakery preparation.",
							"Faris Ahmad",
							"2026-05-16T14:36:00Z"
						),
						note(
							"n-2",
							"Excellent in pastry presentation and customer feedback.",
							"Jane Smith",
							"2025-03-05T01:25:00Z"
						),
						note(
							"n-3",
							"Needs improvement in time management during peak hours.",
							null,
							"2025-10-10T09:43:00Z",
							true
						),
					],
				},
			],
			false,
			client
		),
} satisfies Meta<typeof NotesCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Read mode: each note's actions in a menu. */
export const Default: Story = {};

/** Edit mode: edit and delete buttons on each note. */
export const Editing: Story = { args: { actions: "buttons" } };

/** Only the read key: nothing to add or change. */
export const ReadOnly: Story = {
	parameters: { permissions: ["member_note:read"] },
};
