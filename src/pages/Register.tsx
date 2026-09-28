import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthForm } from "@/features/auth/AuthForm";
export const Register = (): FunctionComponent => (
	<AuthLayout variant="centered">
		<AuthForm mode="register" />
	</AuthLayout>
);
