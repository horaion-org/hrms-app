import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { storyProviders } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import { SCHEDULING_BRANCHES } from "@/features/scheduling/schedules/fixtures";
import {
	FIXTURE_FORTNIGHT,
	stripFixture,
} from "@/features/scheduling/timeline/fixtures";
import { StatusStrip } from "@/features/scheduling/timeline/StatusStrip";

const COMPANY = "c-1";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/Scheduling/StatusStrip",
	component: StatusStrip,
	parameters: {
		layout: "padded",
		permissions: [
			"schedule:read",
			"schedule:publish",
			"schedule:generate",
			"schedule:delete",
		],
	},
	args: {
		companyId: COMPANY,
		departmentId: "d-1",
		days: FIXTURE_FORTNIGHT,
		view: "two",
		...stripFixture("GENERATED"),
	},
	decorators: [
		// The strip is one row of the timeline's table head.
		(Story): ReactElement => (
			<table className="w-full table-fixed border-collapse">
				<thead>
					<Story />
				</thead>
			</table>
		),
		storyCompany(client, COMPANY, SCHEDULING_BRANCHES),
		storyProviders(client),
	],
} satisfies Meta<typeof StatusStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A published week, then a week to review: press a band for the actions on its days. */
export const PublishedThenToReview: Story = {};

/** Two published weeks are one band with a button per week. */
export const TwoPublishedWeeks: Story = {
	args: { ...stripFixture("PUBLISHED") },
};

/** While the second week is being generated its band says so. */
export const Generating: Story = {
	args: { ...stripFixture("GENERATION_REQUESTED") },
};

/** A failed generation is offered again from its band. */
export const Failed: Story = {
	args: { ...stripFixture("GENERATION_FAILED") },
};

/** Days no schedule covers read "No roster", with nothing to press. */
export const NoRoster: Story = { args: { ...stripFixture() } };

/** Four weeks' narrow columns: a band shows its word only where it fits. */
export const FourWeeks: Story = { args: { view: "four" } };
