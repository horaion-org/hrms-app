import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import { DatePicker } from "@/components/forms/DatePicker";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Slider } from "@/components/forms/Slider";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/ui/Button";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import type { MemberSkill, SkillValue } from "@/features/people/api";
import {
	DEFAULT_PROFICIENCY,
	measureOf,
	PROFICIENCY_MAX,
	PROFICIENCY_MIN,
	sameName,
	SKILL_NOTES_MAX_LENGTH,
	skillFormSchema,
	skillsRefusal,
	skillValueOf,
	type SkillFormValues,
	type SkillMeasure,
} from "@/features/people/skills";
import { useSkillSuggestions } from "@/features/people/useSkills";
import type { Skill } from "@/features/skills/api";
import { prefillExpiry } from "@/features/skills/skillRules";

export type SkillDialogProps = {
	companyId: string;
	/** Who the skill is for, for the dialog's description. */
	name: string;
	/** The skills they hold now. */
	held: ReadonlyArray<MemberSkill>;
	/** Set to change one of them; the skill itself stays. Left out to give a new one. */
	editing?: MemberSkill;
	/** Whether the person may add skills to the catalogue, for a link to it. */
	canCreateSkills: boolean;
	/**
	 * Saves the holding. A rejection is explained on the dialog's fields or
	 * as its alert, read as a refusal of the whole set with this holding at
	 * its place in it.
	 */
	onSubmit: (skill: SkillValue) => Promise<void>;
	onClose: () => void;
};

const FIELDS = ["name", "proficiency", "notes", "expiresOn"] as const;
const key = "people.skills.dialog";

/**
 * Gives a person one of the catalogue's active skills, or changes one they
 * hold: how well they do it for a rated skill, notes, and for a skill that
 * tracks expiry the day it was issued and the last day it is valid (filled
 * in from the skill's validity once the issue date is known). A skill they
 * already have can't be given twice. Mount when opened and unmount when
 * closed so every attempt starts fresh.
 */
export const SkillDialog = ({
	companyId,
	name,
	held,
	editing,
	canCreateSkills,
	onSubmit,
	onClose,
}: SkillDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const formId = useId();
	const nameId = `${formId}-name`;
	const proficiencyId = `${formId}-proficiency`;
	const notesId = `${formId}-notes`;
	const issuedOnId = `${formId}-issued-on`;
	const expiresOnId = `${formId}-expires-on`;
	const [chosen, setChosen] = useState<Skill | null>(null);
	const measure: SkillMeasure | undefined = editing
		? measureOf(editing)
		: chosen
			? measureOf(chosen)
			: undefined;
	const validityMonths = editing?.validityMonths ?? chosen?.validityMonths;
	const taken = useMemo(() => held.map((skill) => skill.name), [held]);
	const schema = useMemo(
		() =>
			skillFormSchema(t, { measure, taken, editing: editing !== undefined }),
		[t, measure, taken, editing]
	);
	const form = useForm<SkillFormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: editing?.name ?? "",
			proficiency: editing?.proficiency ?? DEFAULT_PROFICIENCY,
			notes: editing?.notes ?? "",
			issuedOn: editing?.issuedOn ?? "",
			expiresOn: editing?.expiresOn ?? "",
		},
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		control,
		register,
		handleSubmit,
		getValues,
		setValue,
		formState: { errors, isSubmitting },
	} = form;
	const notes = useWatch({ control, name: "notes" });
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	const [query, setQuery] = useState("");
	const suggestions = useSkillSuggestions(companyId, query);
	const offered = (suggestions.data?.items ?? []).filter(
		(skill) => !taken.some((held) => sameName(held, skill.name))
	);
	// Where the holding sits in the set sent, for reading a refusal of it.
	const row = editing
		? held.findIndex((skill) => sameName(skill.name, editing.name))
		: held.length;
	const nameError = errors.name?.message;
	const proficiencyError = errors.proficiency?.message;
	const notesError = errors.notes?.message;
	const expiresOnError = errors.expiresOn?.message;
	const idsOf = formRowIds;
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			formId={formId}
			message={submit.message}
			submitDisabled={!measure}
			submitLabel={t(editing ? `${key}.editSubmit` : `${key}.submit`)}
			submitting={isSubmitting}
			title={t(editing ? `${key}.editTitle` : `${key}.title`)}
			description={
				editing
					? t(`${key}.editDescription`, { name, skill: editing.name })
					: t(`${key}.description`, { name })
			}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					if (!measure) return;
					await submit.run(
						() => onSubmit(skillValueOf(values, measure)),
						(refused) => skillsRefusal(refused, t, row)
					);
				})(event)
			}
		>
			<FormRow
				required
				error={nameError}
				htmlFor={nameId}
				label={t(`${key}.name`)}
				layout="stacked"
				hint={
					editing ? undefined : (
						<>
							{t(`${key}.nameHint`)}
							{canCreateSkills && (
								<>
									{" "}
									<Button to="/organisation/skills" variant="textlink">
										{t(`${key}.createInSkills`)}
									</Button>
								</>
							)}
						</>
					)
				}
			>
				{editing ? (
					<Input
						disabled
						readOnly
						className="w-full"
						id={nameId}
						value={editing.name}
					/>
				) : (
					<Controller
						control={control}
						name="name"
						render={({ field }) => (
							<Combobox<Skill>
								ref={field.ref}
								aria-required
								aria-invalid={Boolean(nameError)}
								aria-labelledby={idsOf(nameId).labelId}
								className="w-full"
								disabled={isSubmitting}
								emptyText={t(`${key}.noResults`)}
								footer={suggestions.isError && t(`${key}.suggestionsFailed`)}
								formatValue={(skill) => skill.name}
								getKey={(skill) => skill.skillId}
								getLabel={(skill) => skill.name}
								id={nameId}
								loading={suggestions.isFetching}
								loadingText={t(`${key}.loading`)}
								multiple={false}
								options={offered}
								placeholder={t(`${key}.namePlaceholder`)}
								query={query}
								searchPlaceholder={t(`${key}.searchPlaceholder`)}
								status={nameError ? "error" : undefined}
								value={chosen}
								aria-describedby={
									nameError ? idsOf(nameId).errorId : idsOf(nameId).hintId
								}
								onQueryChange={setQuery}
								onChange={(skill) => {
									setChosen(skill);
									field.onChange(skill?.name ?? "");
								}}
							/>
						)}
					/>
				)}
			</FormRow>
			{measure?.rated && (
				<FormRow
					required
					error={proficiencyError}
					hint={t(`${key}.proficiencyHint`)}
					htmlFor={proficiencyId}
					label={t(`${key}.proficiency`)}
					layout="stacked"
				>
					<Controller
						control={control}
						name="proficiency"
						render={({ field }) => (
							<span className="flex items-center gap-4">
								<Slider
									ref={field.ref}
									aria-invalid={Boolean(proficiencyError)}
									disabled={isSubmitting}
									id={proficiencyId}
									max={PROFICIENCY_MAX}
									min={PROFICIENCY_MIN}
									name={field.name}
									value={field.value}
									aria-describedby={
										proficiencyError
											? idsOf(proficiencyId).errorId
											: idsOf(proficiencyId).hintId
									}
									aria-valuetext={t("people.skills.valueText", {
										value: field.value,
									})}
									onBlur={field.onBlur}
									onChange={field.onChange}
								/>
								<span
									aria-hidden="true"
									className="w-10 shrink-0 text-right text-sm text-ink-blue-700"
								>
									{t("people.skills.level", { value: field.value })}
								</span>
							</span>
						)}
					/>
				</FormRow>
			)}
			{measure?.tracksExpiry && (
				<div className="grid gap-6 sm:grid-cols-2">
					<FormRow
						htmlFor={issuedOnId}
						label={t(`${key}.issuedOn`)}
						layout="stacked"
					>
						<Controller
							control={control}
							name="issuedOn"
							render={({ field }) => (
								<DatePicker
									ref={field.ref}
									clearable
									aria-labelledby={idsOf(issuedOnId).labelId}
									className="w-full"
									disabled={isSubmitting}
									id={issuedOnId}
									label={t(`${key}.issuedOn`)}
									mode="single"
									name={field.name}
									placeholder={t(`${key}.datePlaceholder`)}
									value={field.value}
									onBlur={field.onBlur}
									onChange={(issuedOn) => {
										field.onChange(issuedOn);
										// The skill's validity fills in an expiry not given yet.
										if (issuedOn && validityMonths && !getValues("expiresOn"))
											setValue(
												"expiresOn",
												prefillExpiry(issuedOn, validityMonths)
											);
									}}
								/>
							)}
						/>
					</FormRow>
					<FormRow
						required
						error={expiresOnError}
						hint={t(`${key}.expiresOnHint`)}
						htmlFor={expiresOnId}
						label={t(`${key}.expiresOn`)}
						layout="stacked"
					>
						<Controller
							control={control}
							name="expiresOn"
							render={({ field }) => (
								<DatePicker
									ref={field.ref}
									clearable
									aria-invalid={Boolean(expiresOnError)}
									aria-labelledby={idsOf(expiresOnId).labelId}
									className="w-full"
									disabled={isSubmitting}
									id={expiresOnId}
									label={t(`${key}.expiresOn`)}
									mode="single"
									name={field.name}
									placeholder={t(`${key}.datePlaceholder`)}
									status={expiresOnError ? "error" : undefined}
									value={field.value}
									aria-describedby={
										expiresOnError
											? idsOf(expiresOnId).errorId
											: idsOf(expiresOnId).hintId
									}
									onBlur={field.onBlur}
									onChange={field.onChange}
								/>
							)}
						/>
					</FormRow>
				</div>
			)}
			{measure && (
				<FormRow
					counter={t(`${key}.notesCounter`, { count: notes.length })}
					error={notesError}
					hint={t(`${key}.notesHint`)}
					htmlFor={notesId}
					label={t(`${key}.notes`)}
					layout="stacked"
				>
					<Textarea
						aria-invalid={Boolean(notesError)}
						className="w-full"
						disabled={isSubmitting}
						id={notesId}
						maxLength={SKILL_NOTES_MAX_LENGTH}
						placeholder={t(`${key}.notesPlaceholder`)}
						rows={3}
						status={notesError ? "error" : undefined}
						aria-describedby={
							notesError ? idsOf(notesId).errorId : idsOf(notesId).hintId
						}
						{...register("notes")}
					/>
				</FormRow>
			)}
		</CreateFormDialog>
	);
};
