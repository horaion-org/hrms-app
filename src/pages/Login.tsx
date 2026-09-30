import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LogInForm } from "@/features/auth/LogInForm";
export const Login = (): FunctionComponent => (
	<AuthLayout>
		<LogInForm />
	</AuthLayout>
);
