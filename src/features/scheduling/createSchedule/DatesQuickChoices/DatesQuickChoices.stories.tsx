import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { DatesQuickChoices } from "@/features/scheduling/createSchedule/DatesQuickChoices";

const meta = {
	title: "Features/Scheduling/DatesQuickChoices",
	component: DatesQuickChoices,
	parameters: { layout: "padded" },
	args: { today: "2026-11-19", onChoose: fn() },
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof DatesQuickChoices>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Thursday 19 November 2026: the rest of the week is four days. */
export const OnAThursday: Story = {};
