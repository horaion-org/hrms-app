import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "@/components/ui/Skeleton";

const meta = {
	title: "UI/Skeleton",
	component: Skeleton,
	args: { className: "h-2.5 w-20" },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Figure: Story = {
	render: () => (
		<div className="flex w-80 flex-col gap-3">
			<Skeleton className="h-12 w-32 rounded-lg" />
			<Skeleton className="h-2.5 w-full" />
			<div className="flex gap-2">
				<Skeleton className="h-2.5 w-20" />
				<Skeleton className="h-2.5 w-20" />
			</div>
		</div>
	),
};
