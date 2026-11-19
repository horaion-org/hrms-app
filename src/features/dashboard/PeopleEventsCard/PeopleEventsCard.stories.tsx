import type { Meta, StoryObj } from "@storybook/react-vite";
import { peopleEventFixture } from "@/features/dashboard/fixtures";
import { PeopleEventsCard } from "@/features/dashboard/PeopleEventsCard";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/PeopleEventsCard",
	component: PeopleEventsCard,
	args: {
		className: "max-w-md",
		events: {
			status: "ready",
			data: [
				peopleEventFixture(),
				peopleEventFixture({
					kind: "LEAVES",
					membershipId: "ms-kent",
					displayName: "Kent Tan",
					day: "2026-11-30",
				}),
			],
		},
	},
} satisfies Meta<typeof PeopleEventsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Failed: Story = { args: { events: { status: "error" } } };
