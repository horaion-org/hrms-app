import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { leaveOptionsQuery } from "@/features/leave/api";
import { LEAVE_FIXTURES, LEAVE_TYPE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveApplyForm } from "./LeaveApplyForm";

const COMPANY = "c-1";

/** A cache already holding everyone's leave options, so stories need no API. */
const clientWithOptions = (leaveTypes = LEAVE_TYPE_FIXTURES): QueryClient => {
	const client = new QueryClient();
	for (const memberId of [
		undefined,
		...LEAVE_FIXTURES.map((leave) => leave.membershipId),
	]) {
		client.setQueryData(leaveOptionsQuery(COMPANY, memberId).queryKey, {
			leaveTypes,
		});
	}
	return client;
};

const meta = {
	title: "Features/Leave/LeaveRequestDialog/LeaveApplyForm",
	component: LeaveApplyForm,
	decorators: [
		(Story): ReactElement => (
			<QueryClientProvider client={clientWithOptions()}>
				<I18nextProvider i18n={authTestI18n}>
					<Story />
				</I18nextProvider>
			</QueryClientProvider>
		),
	],
	args: {
		companyId: COMPANY,
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

/** No leave type applies to the caller's Department yet. */
export const NoTypesApply: Story = {
	args: { employees: undefined },
	decorators: [
		(Story: () => ReactElement): ReactElement => (
			<QueryClientProvider client={clientWithOptions([])}>
				<Story />
			</QueryClientProvider>
		),
	],
};
