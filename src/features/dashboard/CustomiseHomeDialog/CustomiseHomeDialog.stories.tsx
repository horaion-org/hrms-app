import type { Meta, StoryObj } from "@storybook/react-vite";
import { CustomiseHomeDialog } from "@/features/dashboard/CustomiseHomeDialog";
import { HOME_SECTIONS } from "@/features/dashboard/homeSections";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/CustomiseHomeDialog",
	component: CustomiseHomeDialog,
	args: {
		open: true,
		sections: HOME_SECTIONS,
		hiddenSections: ["people-events"],
		saveFailed: false,
		onToggle: (): void => {},
		onReset: (): void => {},
		onClose: (): void => {},
	},
} satisfies Meta<typeof CustomiseHomeDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SaveRefused: Story = { args: { saveFailed: true } };
