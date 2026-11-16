import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Checkbox } from "@/components/ui/Checkbox";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AccessAreaRow } from "@/features/organisation/AccessAreaRow";

const meta = {
	title: "Features/Organisation/AccessAreaRow",
	component: AccessAreaRow,
	parameters: { layout: "padded" },
	args: {
		name: "Leave",
		description:
			"Other people’s leave requests, and approving or rejecting them",
		level: "VIEW",
		levels: [{ level: "NONE" }, { level: "VIEW" }, { level: "MANAGE" }],
		onLevelChange: fn(),
		detailsTitle: "Details · 1 of 3",
		className: "max-w-3xl rounded-lg border border-neutral-400 bg-white",
		children: (
			<>
				<Checkbox checked readOnly label="See leave requests" />
				<Checkbox label="Approve or reject leave" />
				<Checkbox label="Apply for leave for someone else" />
			</>
		),
	},
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof AccessAreaRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CanView: Story = {};

/** The single permissions match no level. */
export const Custom: Story = { args: { level: "CUSTOM" } };

/** Where a local role's area can't all be given at a department. */
export const WithNote: Story = {
	args: {
		name: "Organisation",
		description:
			"Branches, departments, their members, job titles, skills and the activity record",
		note: "Parts of this can’t be given at a department: Details says which.",
	},
};

export const ReadOnly: Story = { args: { disabled: true, level: "MANAGE" } };
