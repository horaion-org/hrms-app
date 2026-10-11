import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { Button } from "@/components/ui/Button";
import "@/common/i18n";

const meta = {
	title: "UI/BulkActionBar",
	component: BulkActionBar,
	parameters: { layout: "padded" },
	args: {
		summary: "3 employees selected",
		onClear: fn(),
		children: (
			<>
				<Button size="sm" variant="secondary">
					Export Selected
				</Button>
				<Button size="sm" variant="secondary">
					Set Inactive
				</Button>
			</>
		),
	},
} satisfies Meta<typeof BulkActionBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
