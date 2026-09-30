import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { PasswordResetForm } from "@/features/auth/PasswordResetForm";

export const PasswordReset = (): FunctionComponent => (
	<AuthLayout>
		<PasswordResetForm />
	</AuthLayout>
);
