import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";

type PageStateProps = {
	title: string;
	description?: string;
	action?: ReactNode;
};

export const PageState = ({
	title,
	description,
	action,
}: PageStateProps): FunctionComponent => {
	return (
		<div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
			<p className="text-sm font-medium text-slate-900">{title}</p>
			{description === undefined ? null : (
				<p className="mt-1 text-sm text-slate-500">{description}</p>
			)}
			{action === undefined ? null : <div className="mt-4">{action}</div>}
		</div>
	);
};

export const LoadingState = (): FunctionComponent => {
	return (
		<div className="flex items-center justify-center p-10" role="status">
			<span
				aria-hidden="true"
				className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
			/>
			<span className="sr-only">Loading</span>
		</div>
	);
};
