import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemberNotes } from "@/features/scheduling/MemberNotes";
import { findingsByMember } from "@/features/scheduling/roster/findingsByMember";
import { generationFindingsFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/MemberNotes",
	component: MemberNotes,
	parameters: { layout: "padded" },
	args: { groups: findingsByMember(generationFindingsFixture()) },
} satisfies Meta<typeof MemberNotes>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
