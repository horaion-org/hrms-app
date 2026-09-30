import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { NewPasswordForm } from "@/features/auth/NewPasswordForm";

export const NewPassword = (): FunctionComponent => (
	<AuthLayout>
		<NewPasswordForm />
	</AuthLayout>
);
