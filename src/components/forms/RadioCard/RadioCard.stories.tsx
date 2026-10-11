import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import { GridIcon, ListIcon } from "@/components/ui/Icon";

const meta = {
	title: "Forms/RadioCard",
	component: RadioCard,
	parameters: { layout: "padded" },
	args: {
		name: "mode",
		value: "shift",
		checked: true,
		label: "By Shift (Recommended)",
		description: "Set required staff for each shift.",
		icon: <ListIcon />,
		onChange: fn(),
		className: "max-w-md",
	},
} satisfies Meta<typeof RadioCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checked: Story = {};

export const Unchecked: Story = { args: { checked: false } };

export const Disabled: Story = { args: { checked: false, disabled: true } };

export const WithoutIcon: Story = { args: { icon: undefined } };

const GroupDemo = (): FunctionComponent => {
	const [mode, setMode] = useState("shift");
	return (
		<div
			aria-label="How would you like to define staffing demand?"
			className="grid gap-6 sm:grid-cols-2"
			role="radiogroup"
		>
			<RadioCard
				checked={mode === "shift"}
				icon={<ListIcon />}
				label="By Shift (Recommended)"
				name="demo-mode"
				value="shift"
				description={
					<>
						Set required staff for each shift.
						<br />
						Faster and easier for most teams.
					</>
				}
				onChange={setMode}
			/>
			<RadioCard
				checked={mode === "blocks"}
				icon={<GridIcon />}
				label="Detailed Time Blocks"
				name="demo-mode"
				value="blocks"
				description={
					<>
						Set demand for 30-minute intervals.
						<br />
						For granular control over the day.
					</>
				}
				onChange={setMode}
			/>
		</div>
	);
};

export const Group: Story = { render: () => <GroupDemo /> };
