import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PeopleChoiceDialog } from "@/features/scheduling/createSchedule/PeopleChoiceDialog";
import { PLAN_PEOPLE } from "@/features/scheduling/dates/fixtures";

const meta = {
	title: "Features/Scheduling/PeopleChoiceDialog",
	component: PeopleChoiceDialog,
	args: {
		departmentName: "Kitchen",
		people: PLAN_PEOPLE,
		value: undefined,
		onApply: fn(),
		onClose: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof PeopleChoiceDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Everyone in Kitchen ticked. */
export const Everyone: Story = {};
/** Two of the three chosen. */
export const TwoChosen: Story = { args: { value: ["m-1", "m-2"] } };
/** Nobody ticked: Use these people waits, with its reason. */
export const NobodyChosen: Story = { args: { value: [] } };
