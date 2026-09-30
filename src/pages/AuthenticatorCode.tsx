import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthenticatorCodeForm } from "@/features/auth/AuthenticatorCodeForm";

export const AuthenticatorCode = (): FunctionComponent => (
	<AuthLayout>
		<AuthenticatorCodeForm />
	</AuthLayout>
);
