import type { Meta, StoryObj } from "@storybook/react-vite";
import { useForm } from "react-hook-form";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { AvailabilityFormValues } from "@/features/availability/AvailabilityDialog/schema";
import {
	WindowRow,
	type WindowRowProps,
} from "@/features/availability/AvailabilityDialog/WindowRow";

/** Holds one row in a form, as the availability dialog does. */
const InForm = (
	props: Omit<WindowRowProps, "control" | "index">
): FunctionComponent => {
	const { control } = useForm<AvailabilityFormValues>({
		defaultValues: {
			rows: [{ days: ["MON", "TUE"], startTime: "09:00", endTime: "17:00" }],
		},
	});
	return <WindowRow control={control} index={0} {...props} />;
};

const meta = {
	title: "Features/Availability/AvailabilityDialog/WindowRow",
	component: InForm,
	parameters: { layout: "padded" },
	args: { onRemove: fn() },
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="max-w-180">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof InForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithProblem: Story = {
	args: { error: "This window overlaps another on Monday." },
};
