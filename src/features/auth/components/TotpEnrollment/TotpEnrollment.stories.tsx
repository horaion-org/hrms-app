import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { TotpEnrollment } from "@/features/auth/components/TotpEnrollment";

const SECRET = "JBSWY3DPEHPK3PXP";

const meta = {
	title: "Features/Auth/Components/TotpEnrollment",
	component: TotpEnrollment,
	args: {
		secret: SECRET,
		otpauthUri: `otpauth://totp/Horaion:jose%40acme.test?secret=${SECRET}&issuer=Horaion`,
		onVerify: fn(() => Promise.resolve()),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<div className="max-w-md p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof TotpEnrollment>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The API refuses the first code, so MFA stays off and the field says why. */
export const WrongCode: Story = {
	args: {
		onVerify: fn(() =>
			Promise.reject(
				new ApiProblemError(400, {
					status: 400,
					errorCode: "INVALID_CODE",
					detail: "Invalid code",
				})
			)
		),
	},
};
