import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import type { IssueRow } from "@/features/scheduling/roster/issueRows";
import { SEVERITY_LOOKS } from "./issuePanelLooks";

export type IssueListRowProps = {
	row: IssueRow;
	open: boolean;
	onToggle: () => void;
	/** What opens under the row; drawn only while it is open. */
	children: ReactNode;
};

const key = "scheduling.issues.panel";

/**
 * One issue: a stripe in its severity's colour, what is wrong over where,
 * and its action on the right ("Cover", "Fix", "Details"; "Close" while
 * open). Pressing it opens its part inline, under it.
 */
export const IssueListRow = ({
	row,
	open,
	onToggle,
	children,
}: IssueListRowProps): FunctionComponent => {
	const { t } = useTranslation();
	const bodyId = useId();
	const looks = SEVERITY_LOOKS[row.severity];
	return (
		<li className="border-b border-neutral-300 last:border-b-0">
			<button
				aria-controls={open ? bodyId : undefined}
				aria-expanded={open}
				className="grid w-full cursor-pointer grid-cols-[4px_minmax(0,1fr)_auto] items-center gap-3 py-3 pr-1 text-left focus-visible:outline-2 focus-visible:outline-ink-blue-500"
				type="button"
				onClick={onToggle}
			>
				<span
					aria-hidden="true"
					className={joinClassNames("self-stretch rounded-r", looks.stripe)}
				/>
				<span className="flex min-w-0 flex-col">
					<span className="sr-only">{t(`${key}.severity.${row.severity}`)}</span>
					<span className="truncate text-sm font-semibold text-neutral-900">
						{row.what}
					</span>
					{row.where && (
						<span className="truncate text-xs text-neutral-700">{row.where}</span>
					)}
				</span>
				<Badge compact tone={looks.badgeTone}>
					{t(open ? `${key}.actions.close` : `${key}.actions.${row.action}`)}
				</Badge>
			</button>
			{open && (
				<div className="flex flex-col gap-2 pb-3 pl-4 text-sm" id={bodyId}>
					{children}
				</div>
			)}
		</li>
	);
};
