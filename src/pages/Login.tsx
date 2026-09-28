import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthForm } from "@/features/auth/AuthForm";
export const Login = (): FunctionComponent => (
	<AuthLayout>
		<AuthForm mode="login" />
	</AuthLayout>
);
