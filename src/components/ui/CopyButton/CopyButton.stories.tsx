import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { CopyButton } from "@/components/ui/CopyButton";
import "@/common/i18n";

const meta = {
	title: "UI/CopyButton",
	component: CopyButton,
	args: { label: "Copy email address", value: "kent.chua@company.com" },
} satisfies Meta<typeof CopyButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Beside the value it copies, as in a person's contact details. */
export const BesideValue: Story = {
	render: (args): NonNullable<FunctionComponent> => (
		<span className="flex items-center gap-2 text-base text-neutral-900">
			{args.value}
			<CopyButton {...args} />
		</span>
	),
};
