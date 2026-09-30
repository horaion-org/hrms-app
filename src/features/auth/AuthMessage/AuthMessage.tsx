import type { ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type AuthMessageProps = {
	kind: "error" | "status";
	children: ReactNode;
};

export const AuthMessage = ({
	kind,
	children,
}: AuthMessageProps): FunctionComponent => (
	<p
		role={kind === "error" ? "alert" : "status"}
		className={joinClassNames(
			"rounded-lg border p-3 text-sm",
			kind === "error"
				? "border-error-200 bg-error-50 text-error-900"
				: "border-success-200 bg-success-50 text-success-900"
		)}
	>
		{children}
	</p>
);
