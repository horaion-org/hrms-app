import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RecentImports } from "@/features/people/RecentImports";

const meta = {
	title: "Features/People/RecentImports",
	component: RecentImports,
	parameters: { layout: "padded" },
	args: {
		onOpen: fn(),
		imports: [
			{
				importId: "i-1",
				status: "COMPLETED",
				requestedBy: "Moses Lee",
				sendInvitations: false,
				totalRows: 48,
				processedRows: 48,
				addedRows: 46,
				invitePendingRows: 0,
				skippedRows: 2,
				failedRows: 0,
				createdAt: "2026-11-04T08:00:00Z",
				finishedAt: "2026-11-04T08:02:00Z",
				rows: [],
			},
		],
	},
} satisfies Meta<typeof RecentImports>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { imports: [] } };
