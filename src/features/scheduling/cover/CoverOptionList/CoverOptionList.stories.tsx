import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { CoverOptionList, type CoverOptionItem } from "./CoverOptionList";

const BEN: CoverOptionItem = {
	membershipId: "m-2",
	name: "Ben Ong",
	lines: ["Within contracted hours", "This week 24 → 30 h of 44 h"],
};
const CHEN: CoverOptionItem = {
	membershipId: "m-3",
	name: "Chen Wei",
	lines: ["Works a day off · 6 h overtime", "Overtime this month 18 → 24 h"],
};
const more = (count: number): Array<CoverOptionItem> =>
	Array.from({ length: count }, (_, index) => ({
		membershipId: `m-${index + 10}`,
		name: `Guard ${index + 1}`,
		lines: ["Works a day off · 8 h overtime", "Overtime this month 0 → 8 h"],
	}));

const meta = {
	title: "Features/Scheduling/Cover/CoverOptionList",
	component: CoverOptionList,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="flex max-w-96 flex-col gap-3 p-4">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
	args: {
		options: [BEN, CHEN],
		selected: "m-2",
		onSelect: fn(),
		unavailable: [
			{ membershipId: "m-1", name: "Aisha Rahman", reason: "On leave" },
			{
				membershipId: "m-4",
				name: "Dev Kumar",
				reason: "Rest day: not offered yet",
			},
		],
		radioName: "cover",
	},
} satisfies Meta<typeof CoverOptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two options, the first suggested and chosen; Can't help collapsed. */
export const TwoOptions: Story = {};

/** One option only. */
export const OneOption: Story = { args: { options: [BEN] } };

/** More than five: the rest wait behind Show more. */
export const MoreThanFive: Story = {
	args: { options: [BEN, CHEN, ...more(5)] },
};

/** Nobody can cover: no options, and Can't help open with every reason. */
export const NobodyCanCover: Story = {
	args: { options: [], selected: undefined, unavailableOpen: true },
};

/** A long name on a phone: it wraps, never cut. */
export const LongNameOnAPhone: Story = {
	args: {
		options: [
			{
				...BEN,
				name: "Nurul Aisyah binti Abdul Rahman Shahrizal",
			},
			CHEN,
		],
	},
	parameters: { viewport: { defaultViewport: "mobile1" } },
};
