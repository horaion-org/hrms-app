import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReviewNotes } from "@/features/scheduling/ReviewNotes";
import { generationFindingsFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ReviewNotes",
	component: ReviewNotes,
	parameters: { layout: "padded" },
	args: { findings: generationFindingsFixture() },
} satisfies Meta<typeof ReviewNotes>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
