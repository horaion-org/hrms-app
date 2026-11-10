import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import type { DataTableColumn } from "@/components/ui/DataTable";
import type { AssignablePerson, SkillHolder } from "@/features/skills/api";

const key = "organisation.skills.assign";

/**
 * The bulk-assign dialog's people columns: the person, their Department,
 * and a Badge saying they already hold the skill (with its level when rated).
 * `holders` is undefined until the skill's holders have loaded.
 */
export const assignablePeopleColumns = (
	t: TFunction,
	holders: ReadonlyMap<string, SkillHolder> | undefined
): Array<DataTableColumn<AssignablePerson>> => [
	{
		id: "name",
		header: t(`${key}.person`),
		cell: (person) => person.displayName,
		sortValue: (person) => person.displayName,
		cellClassName: "font-semibold",
	},
	{
		id: "department",
		header: t(`${key}.department`),
		cell: (person) => person.departmentName ?? t("organisation.skills.none"),
	},
	{
		id: "held",
		header: t(`${key}.held`),
		cell: (person): ReactNode => {
			const holding = holders?.get(person.membershipId);
			if (!holding) return null;
			return (
				<Badge tone="neutral">
					{holding.proficiency === null
						? t(`${key}.hasIt`)
						: t(`${key}.hasLevel`, { value: holding.proficiency })}
				</Badge>
			);
		},
	},
];
