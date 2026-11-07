import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LEAVE_FIXTURES, LEAVE_TYPE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveApplyForm } from "./LeaveApplyForm";

const meta = {
	title: "Features/Leave/LeaveRequestDialog/LeaveApplyForm",
	component: LeaveApplyForm,
	decorators: [
		(Story): ReactElement => (
			<QueryClientProvider client={new QueryClient()}>
				<I18nextProvider i18n={authTestI18n}>
					<Story />
				</I18nextProvider>
			</QueryClientProvider>
		),
	],
	args: {
		leaveTypes: LEAVE_TYPE_FIXTURES,
		busy: false,
		employees: {
			search: "",
			onSearch: fn(),
			options: LEAVE_FIXTURES.map(
				({ membershipId, displayName, employeeCode }) => ({
					membershipId,
					displayName,
					employeeCode,
				})
			),
		},
		onClose: fn(),
		onCreate: fn(),
	},
} satisfies Meta<typeof LeaveApplyForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On a person's behalf: the person is chosen first. */
export const ForSomeone: Story = {};

/** For the caller themself: no person to choose. */
export const Own: Story = { args: { employees: undefined } };

export const Refused: Story = {
	args: {
		refusal: {
			fields: { endDate: "They already have leave on one of these days." },
			refreshMembers: false,
		},
	},
};
