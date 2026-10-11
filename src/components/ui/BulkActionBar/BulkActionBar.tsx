import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/Icon";

export type BulkActionBarProps = {
	/** How many are selected, in words, e.g. "3 employees selected". */
	summary: string;
	onClear: () => void;
	/** The actions for the selection, usually small buttons. */
	children: ReactNode;
	className?: string;
};

/** What is selected in a list and what can be done to all of it at once. */
export const BulkActionBar = ({
	summary,
	onClear,
	children,
	className,
}: BulkActionBarProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div
			className={joinClassNames(
				"flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-400 bg-neutral-50 px-4 py-3",
				className
			)}
		>
			<div className="flex items-center gap-3">
				<Button
					aria-label={t("bulkActionBar.clear")}
					variant="icon"
					onClick={onClear}
				>
					<CloseIcon />
				</Button>
				<p aria-live="polite" className="text-sm font-bold text-neutral-800">
					{summary}
				</p>
			</div>
			<div className="flex flex-wrap gap-4">{children}</div>
		</div>
	);
};
