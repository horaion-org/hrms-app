import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Slider } from "@/components/forms/Slider";

const meta = {
	title: "Forms/Slider",
	component: Slider,
	args: {
		"aria-label": "Proficiency",
		min: 1,
		max: 10,
		step: 1,
		value: 8,
		disabled: false,
		onChange: fn(),
	},
	argTypes: {
		disabled: { control: "boolean" },
		value: { control: { type: "number", min: 1, max: 10 } },
	},
	render: function Render(args): NonNullable<FunctionComponent> {
		const [value, setValue] = useState(args.value);
		return (
			<div className="flex w-72 items-center gap-4">
				<Slider
					{...args}
					aria-valuetext={`${value} out of 10`}
					value={value}
					onChange={(next) => {
						setValue(next);
						args.onChange(next);
					}}
				/>
				<span className="text-xs text-ink-blue-700">{value}/10</span>
			</div>
		);
	},
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

/** Labelled and described by a stacked form row. */
export const InFormRow: Story = {
	args: { "aria-label": undefined, value: 5 },
	render: function Render(args): NonNullable<FunctionComponent> {
		const [value, setValue] = useState(args.value);
		const id = "slider-proficiency";
		return (
			<FormRow
				counter={`${value}/10`}
				hint="From 1, a beginner, to 10, an expert."
				htmlFor={id}
				label="Proficiency"
				layout="stacked"
			>
				<Slider
					{...args}
					aria-describedby={formRowIds(id).hintId}
					id={id}
					value={value}
					onChange={setValue}
				/>
			</FormRow>
		);
	},
};
