import type { Meta, StoryObj } from "@storybook/react-vite";
import { LockIcon } from "@/components/ui/LockIcon";

const meta = {
	title: "UI/Lock icon",
	component: LockIcon,
	args: { className: "size-6 text-neutral-700" },
} satisfies Meta<typeof LockIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Decorative: hidden from assistive technology. */
export const Decorative: Story = {};
/** Titled: announced as an image with that name. */
export const Titled: Story = { args: { title: "Set by company" } };
