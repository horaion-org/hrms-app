import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { ColourSwatchPicker } from "@/components/forms/ColourSwatchPicker";
import "@/common/i18n";

const colours = [
	"#C16A45",
	"#D2A989",
	"#E0A165",
	"#B89C92",
	"#D9BD7C",
	"#8B9151",
	"#C5D278",
	"#A9C0A0",
	"#6F9478",
	"#9FC9BC",
];

const meta = {
	title: "Forms/ColourSwatchPicker",
	component: ColourSwatchPicker,
	args: {
		"aria-labelledby": "colour-label",
		colours,
		value: "#E0A165",
		onChange: fn(),
		disabled: false,
	},
} satisfies Meta<typeof ColourSwatchPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [value, setValue] = useState("#E0A165");
	return (
		<div className="flex max-w-138 flex-col gap-3">
			<span className="text-sm font-bold text-neutral-800" id="colour-label">
				Shift Colour
			</span>
			<ColourSwatchPicker
				aria-labelledby="colour-label"
				colours={colours}
				value={value}
				onChange={setValue}
			/>
		</div>
	);
};

export const Default: Story = { render: () => <InteractiveDemo /> };

export const Disabled: Story = { args: { disabled: true } };
