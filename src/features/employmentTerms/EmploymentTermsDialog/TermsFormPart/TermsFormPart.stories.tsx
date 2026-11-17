import type { Meta, StoryObj } from "@storybook/react-vite";
import { TermsFormPart } from "./TermsFormPart";

const meta = {
	title: "Features/EmploymentTerms/EmploymentTermsDialog/TermsFormPart",
	component: TermsFormPart,
	parameters: { layout: "padded" },
	args: {
		title: "Working week",
		children: <p className="text-sm">The part's fields go here.</p>,
	},
} satisfies Meta<typeof TermsFormPart>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A part with its heading. */
export const Default: Story = {};
