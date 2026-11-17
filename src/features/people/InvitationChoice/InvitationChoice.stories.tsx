import type { Meta, StoryObj } from "@storybook/react-vite";
import { useForm } from "react-hook-form";
import type { FunctionComponent } from "@/common/types";
import { InvitationChoice } from "@/features/people/InvitationChoice";
import {
	EMPTY_PROFILE,
	type ProfileFormValues,
} from "@/features/people/profileFormSchema";
import "@/common/i18n";

/** The choice inside a form of its own, starting as `sendInvitation` says. */
const InForm = ({
	sendInvitation,
}: {
	sendInvitation: boolean;
}): FunctionComponent => {
	const { control } = useForm<ProfileFormValues>({
		defaultValues: { ...EMPTY_PROFILE, sendInvitation },
	});
	return <InvitationChoice control={control} />;
};

const meta = {
	title: "Features/People/InvitationChoice",
	component: InForm,
	parameters: { layout: "padded" },
	args: { sendInvitation: true },
} satisfies Meta<typeof InForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Sending: Story = {};

/** Unticked: nobody is emailed now. */
export const NotSending: Story = { args: { sendInvitation: false } };
