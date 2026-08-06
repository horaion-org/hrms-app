import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";

type AuthCardProps = {
	title: string;
	description?: string;
	children: ReactNode;
	footer?: ReactNode;
};

export const AuthCard = ({
	title,
	description,
	children,
	footer,
}: AuthCardProps): FunctionComponent => {
	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
			<div className="w-full max-w-md space-y-6">
				<div className="space-y-1 text-center">
					<h1 className="text-xl font-semibold text-slate-900">{title}</h1>
					{description === undefined ? null : (
						<p className="text-sm text-slate-500">{description}</p>
					)}
				</div>
				<div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
					{children}
				</div>
				{footer === undefined ? null : (
					<div className="text-center text-sm text-slate-500">{footer}</div>
				)}
			</div>
		</div>
	);
};
