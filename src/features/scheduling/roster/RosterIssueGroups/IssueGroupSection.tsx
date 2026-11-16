import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ChevronDownIcon } from "@/components/ui/Icon";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import type {
	IssueGroup,
	RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";
import { IssueRow } from "./IssueRow";

/** Each group's tone, in the header summary and on its heading. */
export const GROUP_TONES: Record<IssueGroup, BadgeTone> = {
	mustFix: "error",
	notMet: "warning",
	forInformation: "neutral",
};

export type IssueGroupSectionProps = {
	group: IssueGroup;
	items: ReadonlyArray<RosterIssue>;
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
	/** More under the group's items, such as the cover offers out. */
	extra?: ReactNode;
	onShow?: (issue: RosterIssue) => void;
	onFindCover?: (gap: CoverGapRequest) => void;
};

/** One group, foldable by its heading; folded, a one-line gist of who it names. */
export const IssueGroupSection = ({
	group,
	items,
	language,
	extra,
	onShow,
	onFindCover,
}: IssueGroupSectionProps): FunctionComponent => {
	const { t } = useTranslation();
	const [open, setOpen] = useState(true);
	const listId = useId();
	const title = t(`scheduling.issues.groups.${group}`);
	const gist = [...new Set(items.map((issue) => issue.who))].join(", ");
	return (
		<section className="flex flex-col border-t border-neutral-300 pt-2">
			<button
				aria-controls={listId}
				aria-expanded={open}
				aria-label={t("scheduling.issues.groupLabel", {
					group: title,
					count: items.length,
				})}
				className="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm font-semibold text-neutral-900"
				type="button"
				onClick={(): void => {
					setOpen((wasOpen) => !wasOpen);
				}}
			>
				<span className="flex items-center gap-2">
					{title}
					<Badge compact aria-hidden="true" tone={GROUP_TONES[group]}>
						{String(items.length)}
					</Badge>
				</span>
				<ChevronDownIcon
					className={open ? "size-4 shrink-0 rotate-180" : "size-4 shrink-0"}
				/>
			</button>
			{open ? null : (
				<p className="truncate text-sm text-neutral-700">{gist}</p>
			)}
			<div hidden={!open} id={listId}>
				<ul>
					{items.map((issue) => (
						<IssueRow
							key={issue.key}
							issue={issue}
							language={language}
							onFindCover={onFindCover}
							onShow={onShow}
						/>
					))}
				</ul>
				{extra}
			</div>
		</section>
	);
};
