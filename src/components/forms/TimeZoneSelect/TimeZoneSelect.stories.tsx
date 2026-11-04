import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import {
	TimeZoneSelect,
	type TimeZoneSelectProps,
} from "@/components/forms/TimeZoneSelect";
import "@/common/i18n";

const meta = {
	title: "Forms/TimeZoneSelect",
	component: TimeZoneSelect,
	args: {
		value: "",
		viewerZone: "Asia/Singapore",
		"aria-label": "Time zone",
		onChange: fn(),
	},
	render: function Render(
		args: TimeZoneSelectProps
	): NonNullable<FunctionComponent> {
		const [value, setValue] = useState(args.value);
		return (
			<div className="w-110 max-w-full">
				<TimeZoneSelect
					{...args}
					value={value}
					onChange={(next) => {
						setValue(next);
						args.onChange(next);
					}}
				/>
			</div>
		);
	},
} satisfies Meta<typeof TimeZoneSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing chosen yet; the viewer's zone is listed first. */
export const Empty: Story = {};

export const WithValue: Story = { args: { value: "Asia/Jakarta" } };

/** A stored zone the browser doesn't list stays shown by its name. */
export const UnlistedValue: Story = { args: { value: "Mars/Olympus_Mons" } };

export const Error: Story = { args: { status: "error" } };

export const Disabled: Story = {
	args: { value: "Asia/Jakarta", disabled: true },
};
