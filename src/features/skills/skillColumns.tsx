import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
	actionsColumn,
	createdColumn,
	nameColumn,
} from "@/features/organisation/listColumns";
import type { SkillOverview, SkillStatus } from "@/features/skills/api";

const key = "organisation.skills";

/** A skill's status as a Badge; a status newer than the app reads as unknown. */
export const skillStatusBadge = (
	status: SkillStatus,
	t: TFunction
): ReactNode => (
	<Badge tone={status === "ACTIVE" ? "success" : "neutral"}>
		{status === "UNKNOWN"
			? t(`${key}.statusUnknown`)
			: t(`organisation.status.${status}`)}
	</Badge>
);

/** How holders are measured, in words. */
export const measureLabel = (
	skill: Pick<SkillOverview, "proficiencyScale">,
	t: TFunction
): string => t(`${key}.measure.${skill.proficiencyScale}`);

/** Whether holders record an expiry, and for how long a new one usually lasts. */
const expiryLabel = (skill: SkillOverview, t: TFunction): string => {
	if (!skill.tracksExpiry) return t(`${key}.none`);
	return skill.validityMonths === null
		? t(`${key}.expiryTracked`)
		: t(`${key}.expiryTrackedFor`, { count: skill.validityMonths });
};

/** How many people hold it, with Badges for credentials expiring soon or expired. */
const holdersCell = (skill: SkillOverview, t: TFunction): ReactNode => (
	<span className="flex flex-wrap items-center gap-2">
		<span className={skill.holders === 0 ? "text-neutral-700" : undefined}>
			{t(`${key}.holdersCount`, { count: skill.holders })}
		</span>
		{skill.expiringSoon > 0 && (
			<Badge tone="warning">
				{t(`${key}.expiringSoon`, { count: skill.expiringSoon })}
			</Badge>
		)}
		{skill.expired > 0 && (
			<Badge tone="error">
				{t(`${key}.expired`, { count: skill.expired })}
			</Badge>
		)}
	</span>
);

/**
 * The catalogue's columns: the skill with its description, category, how
 * it is measured, expiry, holders, status, when created, and the row's
 * actions (Edit and a menu of `menu`). Phones keep the skill and the
 * actions; its status joins from `sm` and the rest from `md`.
 */
export const skillColumns = (
	t: TFunction,
	language: string,
	menu: (skill: SkillOverview) => ReactNode,
	canEdit: (skill: SkillOverview) => boolean,
	onEdit: (skill: SkillOverview) => void
): Array<DataTableColumn<SkillOverview>> => [
	nameColumn<SkillOverview>(t(`${key}.name`), (skill) => skill.description),
	{
		id: "category",
		header: t(`${key}.category`),
		cell: (skill) => skill.category ?? t(`${key}.none`),
		summary: (skill) => skill.category,
		sortValue: (skill) => skill.category ?? "",
		hideBelow: "md",
	},
	{
		id: "measure",
		header: t(`${key}.measuredBy`),
		cell: (skill) => measureLabel(skill, t),
		hideBelow: "md",
	},
	{
		id: "expiry",
		header: t(`${key}.expiry`),
		cell: (skill) => expiryLabel(skill, t),
		// On the name's line "—" would say nothing, so an untracked expiry is said in words.
		summary: (skill) =>
			skill.tracksExpiry
				? expiryLabel(skill, t)
				: t(`${key}.expiryNotTracked`),
		hideBelow: "md",
	},
	{
		id: "holders",
		header: t(`${key}.holders`),
		cell: (skill) => holdersCell(skill, t),
		sortValue: (skill) => skill.holders,
		hideBelow: "md",
	},
	{
		id: "status",
		header: t("organisation.list.status"),
		cell: (skill) => skillStatusBadge(skill.status, t),
		sortValue: (skill) => skill.status,
		headerClassName: "w-30",
		hideBelow: "sm",
	},
	createdColumn<SkillOverview>(t, language),
	actionsColumn<SkillOverview>(t, menu, canEdit, onEdit),
];
