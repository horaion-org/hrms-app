import { Link } from "@tanstack/react-router";
import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";

export const PasswordRecovery = (): FunctionComponent => (
	<AuthLayout>
		<div className="space-y-1">
			<h1 className="text-3xl font-bold text-ink-blue-900">
				Reset your password
			</h1>
			<p className="text-sm text-slate-600" role="status">
				Password reset is not available in this version yet.
			</p>
		</div>
		<p className="mt-6 text-center text-sm text-slate-600">
			<Link
				className="text-ink-blue-900 underline underline-offset-2"
				to="/login"
			>
				Back to sign in
			</Link>
		</p>
	</AuthLayout>
);
