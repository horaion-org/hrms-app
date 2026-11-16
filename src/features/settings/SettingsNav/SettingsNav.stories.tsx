import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { SettingsNav } from "@/features/settings/SettingsNav";
import { visibleGroups } from "@/features/settings/sections";

const EVERYTHING = visibleGroups({
	employment: true,
	scheduling: true,
	"roster-approvals": true,
	"leave-types": true,
	"leave-durations": true,
	"leave-approvals": true,
	access: true,
	data: true,
});

const meta = {
	title: "Features/Settings/SettingsNav",
	component: SettingsNav,
	args: { groups: EVERYTHING, selected: "leave-durations" },
	parameters: { initialEntry: "/settings?section=leave-durations" },
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<div className="w-52 border border-neutral-400">
				<Story />
			</div>
		),
		withMemoryRouter,
	],
} satisfies Meta<typeof SettingsNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An owner's list: every group and entry, Leave durations current. */
export const Everything: Story = {};

/** A department admin who manages only leave durations. */
export const DurationsOnly: Story = {
	args: {
		groups: visibleGroups({
			employment: false,
			scheduling: false,
			"roster-approvals": false,
			"leave-types": false,
			"leave-durations": true,
			"leave-approvals": false,
			access: false,
			data: false,
		}),
	},
};
