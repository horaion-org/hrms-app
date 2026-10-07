import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { PeopleNotice as Notice } from "@/features/people/peopleNoticeState";

export type PeopleNoticeProps = { notice: Notice; className?: string };

type NoticeKey =
	| "people.added"
	| "people.roleNotAssigned"
	| "people.saved"
	| "people.roleNotChanged"
	| "people.skillsNotSaved"
	| "people.roleAndSkillsNotChanged"
	| `people.${Exclude<Notice["kind"], "added" | "saved">}`;

/** The copy for each notice: a role or skills left unchanged are said, and warned about. */
const messageKey = ({
	kind,
	roleNotAssigned,
	skillsNotSaved,
}: Notice): NoticeKey => {
	if (kind === "added")
		return roleNotAssigned ? "people.roleNotAssigned" : "people.added";
	if (kind === "saved" && skillsNotSaved)
		return roleNotAssigned
			? "people.roleAndSkillsNotChanged"
			: "people.skillsNotSaved";
	if (kind === "saved")
		return roleNotAssigned ? "people.roleNotChanged" : "people.saved";
	return `people.${kind}`;
};

/** The status line confirming a change to a person, such as "Priya Nair was added." */
export const PeopleNotice = ({
	notice,
	className,
}: PeopleNoticeProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<p
			role="status"
			className={joinClassNames(
				"text-sm font-semibold text-success-700 data-warning:text-warning-700",
				className
			)}
			data-warning={
				notice.roleNotAssigned || notice.skillsNotSaved || undefined
			}
		>
			{t(messageKey(notice), { name: notice.name })}
		</p>
	);
};
