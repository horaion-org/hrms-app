import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog, type DialogProps } from "@/components/ui/Dialog";

const Example = (args: DialogProps): FunctionComponent => {
	const [open, setOpen] = useState(args.open);
	return (
		<>
			<Button
				onClick={() => {
					setOpen(true);
				}}
			>
				Create branch
			</Button>
			<Dialog
				{...args}
				open={open}
				footer={
					<div className="flex justify-end gap-3">
						<Button
							disabled={args.preventClose}
							variant="secondary"
							onClick={() => {
								setOpen(false);
							}}
						>
							Cancel
						</Button>
						<Button loading={args.preventClose}>Create branch</Button>
					</div>
				}
				onClose={() => {
					setOpen(false);
				}}
			/>
		</>
	);
};

const meta = {
	title: "UI/Dialog",
	component: Dialog,
	args: {
		open: true,
		title: "Create branch",
		description: "Add a branch to your organisation and choose who heads it.",
		children: "Branch details go here.",
		onClose: (): void => {},
	},
	render: (args): NonNullable<FunctionComponent> => <Example {...args} />,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongBody: Story = {
	args: {
		children: (
			<div className="space-y-6">
				{Array.from({ length: 30 }, (_, index) => (
					<p key={index}>Branch details {index + 1}</p>
				))}
			</div>
		),
	},
};
export const PreventClose: Story = { args: { preventClose: true } };
