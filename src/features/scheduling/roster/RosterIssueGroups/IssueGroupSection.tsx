import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { ChevronDownIcon } from "@/components/ui/Icon";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	dayTypeRetypeGroups,
	type IssueFixes,
} from "@/features/scheduling/roster/dayTypeFix";
import {
	GROUPS_STARTING_CLOSED,
	topicGist,
	type IssueGroup,
	type RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";
import { IssueFixAll } from "./IssueFix";
import { IssueRow } from "./IssueRow";
import { GROUP_LOOKS } from "./issueGroupTones";

export type IssueGroupSectionProps = {
	group: IssueGroup;
	items: ReadonlyArray<RosterIssue>;
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
	/** More under the group's items, such as the cover offers out. */
	extra?: ReactNode;
	onShow?: (issue: RosterIssue) => void;
	onFindCover?: (gap: CoverGapRequest) => void;
	/** The fixes Issues can make itself, by row. */
	fixes?: IssueFixes;
};

/**
 * One group, foldable by its heading (its tone's icon, title and count);
 * folded, a line counting what it holds by kind. Open at first, unless it is one
 * of `GROUPS_STARTING_CLOSED`. Above its rows, one action per rule with two
 * or more rows that have the same fix, which makes them all in one change.
 */
export const IssueGroupSection = ({
	group,
	items,
	language,
	extra,
	onShow,
	onFindCover,
	fixes,
}: IssueGroupSectionProps): FunctionComponent => {
	const { t } = useTranslation();
	const [open, setOpen] = useState(!GROUPS_STARTING_CLOSED.includes(group));
	const listId = useId();
	const { badgeTone, icon: GroupIcon, textTone } = GROUP_LOOKS[group];
	const title = t(`scheduling.issues.groups.${group}`);
	const gist = topicGist(items, t);
	const onFixAll = fixes?.onFixAll;
	const fixGroups =
		fixes && onFixAll ? dayTypeRetypeGroups(items, fixes.retypes) : [];
	return (
		<section className="flex flex-col border-t border-neutral-300 pt-2">
			<button
				aria-controls={listId}
				aria-expanded={open}
				className="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm font-semibold text-neutral-900"
				type="button"
				aria-label={t("scheduling.issues.groupLabel", {
					group: title,
					count: items.length,
				})}
				onClick={(): void => {
					setOpen((wasOpen) => !wasOpen);
				}}
			>
				<span className="flex items-center gap-2">
					<GroupIcon className={joinClassNames("size-4 shrink-0", textTone)} />
					{title}
					<Badge compact aria-hidden="true" tone={badgeTone}>
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
				{fixes && onFixAll
					? fixGroups.map((fixGroup) => (
							<IssueFixAll
								key={fixGroup.key}
								fixes={{ ...fixes, onFixAll }}
								group={fixGroup}
							/>
						))
					: null}
				<ul>
					{items.map((issue) => (
						<IssueRow
							key={issue.key}
							fixes={fixes}
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
