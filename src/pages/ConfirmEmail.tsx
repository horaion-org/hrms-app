import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { EmailConfirmationForm } from "@/features/auth/EmailConfirmationForm";

export const ConfirmEmail = (): FunctionComponent => (
	<AuthLayout>
		<EmailConfirmationForm />
	</AuthLayout>
);
