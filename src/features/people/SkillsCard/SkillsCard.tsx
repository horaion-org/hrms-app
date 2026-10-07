import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Slider } from "@/components/forms/Slider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DeleteIcon, SkillsIcon } from "@/components/ui/Icon";
import type { MemberProfileDetail, SkillValue } from "@/features/people/api";
import { ProficiencyMeter } from "@/features/people/ProficiencyMeter";
import { isRefused } from "@/features/people/profileEditAccess";
import { SkillDialog } from "@/features/people/SkillDialog";
import {
	PROFICIENCY_MAX,
	PROFICIENCY_MIN,
	withSkill,
} from "@/features/people/skills";
import {
	useMemberSkills,
	useReplaceSkills,
	type SkillsDraft,
} from "@/features/people/useSkills";

export type SkillsCardProps = {
	companyId: string;
	profile: MemberProfileDetail;
	/** Whether the person viewing may change them; false leaves the skills read-only. */
	changeable: boolean;
	/**
	 * Given while the page is being edited: each skill becomes a slider with
	 * a remove button, and every change, an added skill included, is held
	 * here until the page saves.
	 */
	draft?: SkillsDraft;
	className?: string;
};

const key = "people.skills";
const headerCell =
	"h-11 border-l border-neutral-400 bg-neutral-200 px-3 text-left text-sm font-bold text-neutral-900 first:border-l-0";
const bodyCell =
	"h-10 border-l border-neutral-400 bg-white px-3 py-2 text-xs break-words text-neutral-900 first:border-l-0";

/**
 * A person's skills and how well they do each, in name order, with their
 * count. Read-only, each is a ten-segment meter; with `draft`, a slider.
 * "Add skill" is offered only when `changeable`: it saves straight away, or
 * joins `draft` while the page is being edited. Nothing is drawn when the
 * API refuses the skills.
 */
export const SkillsCard = ({
	companyId,
	profile,
	changeable,
	draft,
	className,
}: SkillsCardProps): FunctionComponent => {
	const { t } = useTranslation();
	const loaded = useMemberSkills(companyId, profile.membershipId);
	const replace = useReplaceSkills(companyId, profile.membershipId);
	const [adding, setAdding] = useState(false);
	const editable = draft !== undefined && changeable;
	const skills: ReadonlyArray<SkillValue> | undefined = loaded.isSuccess
		? editable
			? draft.skills
			: loaded.data
		: undefined;

	const add = async (skill: SkillValue): Promise<void> => {
		if (!skills || !changeable) return;
		if (editable) {
			draft.onChange(withSkill(skills, skill));
			return;
		}
		// The API replaces the whole set, so the new skill goes last.
		await replace.mutateAsync([
			...skills.map(({ name, proficiency }) => ({ name, proficiency })),
			skill,
		]);
	};
	const change = (index: number, proficiency: number): void => {
		if (editable)
			draft.onChange(
				draft.skills.map((skill, at) =>
					at === index ? { ...skill, proficiency } : skill
				)
			);
	};
	const remove = (index: number): void => {
		if (editable) draft.onChange(draft.skills.filter((_, at) => at !== index));
	};
	if (isRefused(loaded.error)) return null;

	return (
		<Card
			className={className}
			icon={SkillsIcon}
			action={
				changeable &&
				skills && (
					<Button
						variant="hyperlink"
						onClick={() => {
							setAdding(true);
						}}
					>
						{t(`${key}.add`)}
					</Button>
				)
			}
			title={
				skills
					? t(`${key}.titleCount`, { count: skills.length })
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
			{skills?.length === 0 && (
				<p className="text-sm text-neutral-700">{t(`${key}.empty`)}</p>
			)}
			{skills && skills.length > 0 && (
				<div className="overflow-hidden rounded-lg border border-neutral-400">
					<table
						aria-label={t(`${key}.title`)}
						className="w-full table-fixed border-collapse"
					>
						<thead>
							<tr>
								<th className={`${headerCell} w-2/5`} scope="col">
									{t(`${key}.skill`)}
								</th>
								<th className={headerCell} scope="col">
									{t(`${key}.proficiency`)}
								</th>
							</tr>
						</thead>
						<tbody>
							{skills.map((skill, index) => (
								<tr
									key={skill.name.toLocaleLowerCase()}
									className="border-t border-neutral-400"
								>
									<th className={`${bodyCell} font-normal`} scope="row">
										{skill.name}
									</th>
									<td className={bodyCell}>
										{editable ? (
											<span className="flex items-center gap-3">
												<Slider
													max={PROFICIENCY_MAX}
													min={PROFICIENCY_MIN}
													value={skill.proficiency}
													aria-label={t(`${key}.proficiencyOf`, {
														name: skill.name,
													})}
													aria-valuetext={t(`${key}.valueText`, {
														value: skill.proficiency,
													})}
													onChange={(value) => {
														change(index, value);
													}}
												/>
												<span
													aria-hidden="true"
													className="w-9 shrink-0 text-right text-xs text-ink-blue-700"
												>
													{t(`${key}.level`, { value: skill.proficiency })}
												</span>
												<Button
													aria-label={t(`${key}.remove`, { name: skill.name })}
													className="-my-2 -mr-2"
													variant="icon"
													onClick={() => {
														remove(index);
													}}
												>
													<DeleteIcon className="text-error-600" />
												</Button>
											</span>
										) : (
											<ProficiencyMeter
												name={skill.name}
												value={skill.proficiency}
											/>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{adding && skills && (
				<SkillDialog
					companyId={companyId}
					name={profile.displayName}
					skills={skills}
					onSubmit={add}
					onClose={() => {
						setAdding(false);
					}}
				/>
			)}
		</Card>
	);
};
