import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const meta = {
	title: "UI/Modal",
	component: Modal,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		open: true,
		title: "Leave request",
		children: <p className="p-6">Review the request before approving.</p>,
		onClose: (): void => {},
	},
	render: function Example(args): ReactElement {
		const [open, setOpen] = useState(args.open);
		return (
			<>
				<Button
					onClick={() => {
						setOpen(true);
					}}
				>
					Open dialog
				</Button>
				<Modal
					{...args}
					open={open}
					onClose={() => {
						setOpen(false);
					}}
				/>
			</>
		);
	},
} satisfies Meta<typeof Modal>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
