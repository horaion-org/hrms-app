import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";

export type CellPanelAlertProps = {
	/** Why the change or leave move didn't go through. */
	children: ReactNode;
};

/** A failure in the day editor, announced as it appears. */
export const CellPanelAlert = ({
	children,
}: CellPanelAlertProps): FunctionComponent => (
	<p className="text-sm text-error-700" role="alert">
		{children}
	</p>
);
