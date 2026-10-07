import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { storyProviders } from "@/features/organisation/storyApi";
import { SkillsCard } from "@/features/people/SkillsCard";
import { storyCompany } from "@/features/people/storyCompany";
import { memberSkillsQuery, type SkillValue } from "@/features/people/api";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
const SKILLS = [
	["Baking", 8],
	["Food safety", 7],
	["Customer service", 4],
	["Time management", 5],
	["Inventory management", 9],
	["Adaptability", 7],
].map(([name, proficiency], index) => ({
	skillId: `s-${index}`,
	name: String(name),
	proficiency: Number(proficiency),
}));
client.setQueryData(memberSkillsQuery(COMPANY, "m-1").queryKey, SKILLS);

const meta = {
	title: "Features/People/SkillsCard",
	component: SkillsCard,
	parameters: { layout: "padded" },
	args: {
		companyId: COMPANY,
		className: "max-w-xl",
		changeable: false,
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
} satisfies Meta<typeof SkillsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Read-only: ten-segment meters. */
export const Default: Story = {};

/** For someone who may change them, "Add skill" is offered. */
export const CanAdd: Story = {
	args: { changeable: true },
};

/** While the profile is edited: sliders and remove buttons, held locally. */
export const Editing: Story = {
	args: { changeable: true },
	render: function Render(args): NonNullable<FunctionComponent> {
		const [skills, setSkills] = useState<Array<SkillValue>>(SKILLS);
		return (
			<SkillsCard
				{...args}
				draft={{ skills, onChange: setSkills, changed: false }}
			/>
		);
	},
};
