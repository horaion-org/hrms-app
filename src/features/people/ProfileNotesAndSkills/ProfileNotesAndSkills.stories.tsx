import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { storyProviders } from "@/features/organisation/storyApi";
import { memberNotesQuery, memberSkillsQuery } from "@/features/people/api";
import { ProfileNotesAndSkills } from "@/features/people/ProfileNotesAndSkills";
import { storyCompany } from "@/features/people/storyCompany";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(memberSkillsQuery(COMPANY, "m-1").queryKey, [
	{ skillId: "s-1", name: "Baking", proficiency: 8 },
	{ skillId: "s-2", name: "Food safety", proficiency: 7 },
]);
client.setQueryData(memberNotesQuery(COMPANY, "m-1").queryKey, {
	pageParams: [0],
	pages: [
		{
			total: 1,
			items: [
				{
					noteId: "n-1",
					body: "Reliable and punctual. Shows great attention to detail in bakery preparation.",
					author: { membershipId: "m-9", displayName: "Faris Ahmad" },
					createdAt: "2026-05-16T14:36:00Z",
					updatedAt: "2026-05-16T14:36:00Z",
					edited: false,
				},
			],
		},
	],
});

const meta = {
	title: "Features/People/ProfileNotesAndSkills",
	component: ProfileNotesAndSkills,
	parameters: {
		layout: "padded",
		permissions: ["member_note:read", "member_note:update"],
	},
	args: {
		companyId: COMPANY,
		noteActions: "menu",
		skillsChangeable: true,
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
			invitationPending: false,
		},
	},
	decorators: [storyCompany(client, COMPANY), storyProviders(client)],
} satisfies Meta<typeof ProfileNotesAndSkills>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Without the notes key, only the skills are shown. */
export const SkillsOnly: Story = { parameters: { permissions: [] } };
