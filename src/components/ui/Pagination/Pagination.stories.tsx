import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { Pagination } from "@/components/ui/Pagination";
const meta = {
	title: "UI/Pagination",
	component: Pagination,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: { page: 1, pageSize: 10, total: 24, onPageChange: (): void => {} },
	render: function Example(args): ReactElement {
		const [page, setPage] = useState(args.page);
		return <Pagination {...args} page={page} onPageChange={setPage} />;
	},
} satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { total: 0 } };
