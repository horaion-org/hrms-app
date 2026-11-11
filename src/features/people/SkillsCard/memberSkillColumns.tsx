import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { formatDate } from "@/components/forms/Calendar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon } from "@/components/ui/Icon";
import type { MemberSkill } from "@/features/people/api";
import { ProficiencyMeter } from "@/features/people/ProficiencyMeter";
import { expiryBadge, expiryStatusOn } from "@/features/skills/skillRules";

const key = "people.skills";

export type MemberSkillColumnsOptions = {
	/** The locale dates are written in. */
	locale: string;
	/** The day expiry is measured from. */
	today: string;
	/** Some held skill tracks expiry, so the expiry column shows. */
	showsExpiry: boolean;
	/** Whether the reader may change this person's skills; adds Edit and Remove. */
	changeable: boolean;
	onEdit: (skill: MemberSkill) => void;
	onRemove: (skill: MemberSkill) => void;
};

/**
 * A person's skills table columns: the skill with its notes (and Inactive
 * when the catalogue retired it), the proficiency meter, the last valid day
 * with an expiry Badge when any skill tracks expiry, and Edit / Remove when
 * the reader may change them.
 */
export const memberSkillColumns = (
	t: TFunction,
	{
		locale,
		today,
		showsExpiry,
		changeable,
		onEdit,
		onRemove,
	}: MemberSkillColumnsOptions
): Array<DataTableColumn<MemberSkill>> => {
	const expiryCell = (skill: MemberSkill): ReactNode => {
		const status = expiryStatusOn(skill, today);
		if (!status) return null;
		const badge = expiryBadge(status, t);
		return (
			<span className="flex flex-wrap items-center gap-2">
				{skill.expiresOn && (
					<time dateTime={skill.expiresOn}>
						{formatDate(skill.expiresOn, locale)}
					</time>
				)}
				<Badge tone={badge.tone}>{badge.label}</Badge>
			</span>
		);
	};
	return [
		{
			id: "name",
			header: t(`${key}.skill`),
			cell: (skill) => (
				<>
					<span className="block font-semibold">
						{skill.name}
						{skill.skillStatus === "INACTIVE" && (
							<Badge className="ml-2" tone="neutral">
								{t("organisation.status.INACTIVE")}
							</Badge>
						)}
					</span>
					{skill.notes && (
						<span
							className="block truncate text-neutral-700"
							title={skill.notes}
						>
							{skill.notes}
						</span>
					)}
				</>
			),
			sortValue: (skill) => skill.name.toLocaleLowerCase(),
		},
		{
			id: "proficiency",
			header: t(`${key}.proficiency`),
			cell: (skill) =>
				skill.proficiency === null ? (
					<span className="text-neutral-700">{t(`${key}.notRated`)}</span>
				) : (
					<ProficiencyMeter name={skill.name} value={skill.proficiency} />
				),
			sortValue: (skill) => skill.proficiency ?? 0,
		},
		...(showsExpiry
			? [
					{
						id: "expiry",
						header: t(`${key}.expiresOn`),
						cell: expiryCell,
						sortValue: (skill: MemberSkill): string => skill.expiresOn ?? "",
					},
				]
			: []),
		...(changeable
			? [
					{
						id: "actions",
						header: t(`${key}.actions`),
						cell: (skill: MemberSkill): ReactNode => (
							<span className="flex items-center justify-center gap-2">
								<Button
									aria-label={t(`${key}.edit`, { name: skill.name })}
									variant="icon"
									onClick={() => {
										onEdit(skill);
									}}
								>
									<EditIcon />
								</Button>
								<Button
									aria-label={t(`${key}.remove`, { name: skill.name })}
									variant="icon"
									onClick={() => {
										onRemove(skill);
									}}
								>
									<DeleteIcon className="text-error-600" />
								</Button>
							</span>
						),
						headerClassName: "w-28",
						cellClassName: "px-0",
					},
				]
			: []),
	];
};
