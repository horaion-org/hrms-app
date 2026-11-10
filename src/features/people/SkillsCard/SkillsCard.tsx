import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { mapRefusal } from "@/common/refusal";
import type { FunctionComponent } from "@/common/types";
import { formatDate, todayDate } from "@/components/forms/Calendar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon, SkillsIcon } from "@/components/ui/Icon";
import type { MemberProfileDetail, MemberSkill } from "@/features/people/api";
import { ProficiencyMeter } from "@/features/people/ProficiencyMeter";
import { isRefused } from "@/features/people/profileEditAccess";
import { SkillDialog } from "@/features/people/SkillDialog";
import {
	withChangedHolding,
	withHolding,
	withoutHolding,
} from "@/features/people/skills";
import { useMemberSkills, useReplaceSkills } from "@/features/people/useSkills";
import {
	expiryBadge,
	expiryStatusOn,
	sortHeldSkills,
} from "@/features/skills/skillRules";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

export type SkillsCardProps = {
	companyId: string;
	profile: MemberProfileDetail;
	/** Whether the person viewing may change them; false leaves the skills read-only. */
	changeable: boolean;
	className?: string;
};

const key = "people.skills";

/** Which dialog is open: giving a skill, changing one, or confirming a removal. */
type Open =
	| { kind: "add" }
	| { kind: "edit"; skill: MemberSkill }
	| { kind: "remove"; skill: MemberSkill };

/**
 * A person's skills best first, with their count: a ten-segment meter for a
 * rated skill, notes beneath its name, and for a skill that tracks expiry
 * the last valid day with a Badge saying where it stands. When
 * `changeable`, each change saves at once and is confirmed: "Add skill",
 * Edit on a row, and Remove after asking. Nothing is drawn when the API
 * refuses the skills.
 */
export const SkillsCard = ({
	companyId,
	profile,
	changeable,
	className,
}: SkillsCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	// Dates follow the browser's region of the app's language (en-GB: day first).
	const locale = formattingLocale(i18n);
	const { membershipId } = profile;
	const loaded = useMemberSkills(companyId, membershipId);
	const add = useReplaceSkills(companyId, membershipId, "added");
	const update = useReplaceSkills(companyId, membershipId, "updated");
	const remove = useReplaceSkills(companyId, membershipId, "removed");
	// Adding to the catalogue is company authority; the dialog only links to it.
	const canCreateSkills = useAccess().can("skill:create", COMPANY_SCOPE);
	const [open, setOpen] = useState<Open>();
	const [today] = useState(() => todayDate(Date.now()));
	const held = useMemo(
		() => (loaded.data ? sortHeldSkills(loaded.data) : undefined),
		[loaded.data]
	);
	const showsExpiry = held?.some((skill) => skill.tracksExpiry) ?? false;
	const close = (): void => {
		remove.reset();
		setOpen(undefined);
	};
	const columns = useMemo((): Array<DataTableColumn<MemberSkill>> => {
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
											setOpen({ kind: "edit", skill });
										}}
									>
										<EditIcon />
									</Button>
									<Button
										aria-label={t(`${key}.remove`, { name: skill.name })}
										variant="icon"
										onClick={() => {
											setOpen({ kind: "remove", skill });
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
	}, [t, locale, today, showsExpiry, changeable]);
	if (isRefused(loaded.error)) return null;

	return (
		<Card
			className={className}
			icon={SkillsIcon}
			action={
				changeable &&
				held && (
					<Button
						variant="hyperlink"
						onClick={() => {
							setOpen({ kind: "add" });
						}}
					>
						{t(`${key}.add`)}
					</Button>
				)
			}
			title={
				held
					? t(`${key}.titleCount`, { count: held.length })
					: t(`${key}.title`)
			}
		>
			{loaded.isPending && (
				<p className="text-sm text-neutral-700">{t(`${key}.loading`)}</p>
			)}
			{loaded.isError && (
				<p className="text-sm text-error-700" role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{held?.length === 0 && (
				<p className="text-sm text-neutral-700">{t(`${key}.empty`)}</p>
			)}
			{held && held.length > 0 && (
				<DataTable
					columns={columns}
					data={held}
					defaultSort={{ id: "proficiency", desc: true }}
					getRowId={(skill) => skill.skillId}
					label={t(`${key}.title`)}
				/>
			)}
			{held && open?.kind === "add" && (
				<SkillDialog
					canCreateSkills={canCreateSkills}
					companyId={companyId}
					held={held}
					name={profile.displayName}
					onClose={close}
					onSubmit={async (skill) => {
						await add.mutateAsync(withHolding(held, skill));
					}}
				/>
			)}
			{held && open?.kind === "edit" && (
				<SkillDialog
					canCreateSkills={canCreateSkills}
					companyId={companyId}
					editing={open.skill}
					held={held}
					name={profile.displayName}
					onClose={close}
					onSubmit={async (skill) => {
						await update.mutateAsync(withChangedHolding(held, skill));
					}}
				/>
			)}
			{held && open?.kind === "remove" && (
				<ConfirmDialog
					cancelLabel={t(`${key}.confirmRemove.cancel`)}
					confirmLabel={t(`${key}.confirmRemove.confirm`)}
					submitting={remove.isPending}
					tone="danger"
					description={t(`${key}.confirmRemove.description`, {
						name: profile.displayName,
					})}
					error={
						remove.error
							? mapRefusal(remove.error, {
									forbidden: t(`${key}.dialog.forbidden`),
									failed: t(`${key}.dialog.failed`),
								}).message
							: undefined
					}
					title={t(`${key}.confirmRemove.title`, {
						skill: open.skill.name,
						name: profile.displayName,
					})}
					onClose={close}
					onConfirm={() => {
						remove.mutate(withoutHolding(held, open.skill.name), {
							onSuccess: close,
						});
					}}
				/>
			)}
		</Card>
	);
};
