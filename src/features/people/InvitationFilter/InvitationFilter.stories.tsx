import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { InvitationFilter } from "@/features/people/InvitationFilter";

const meta = {
	title: "Features/People/InvitationFilter",
	component: InvitationFilter,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: { onChange: (): void => {} },
} satisfies Meta<typeof InvitationFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Everyone, signed in or not. */
export const Everyone: Story = {};
/** Only the people marked Invited: they have not signed in yet. */
export const NotSignedInYet: Story = { args: { value: "pending" } };
