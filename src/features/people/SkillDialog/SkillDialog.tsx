import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Slider } from "@/components/forms/Slider";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import type { SkillValue } from "@/features/people/api";
import {
	DEFAULT_PROFICIENCY,
	PROFICIENCY_MAX,
	PROFICIENCY_MIN,
	skillChoices,
	skillFormSchema,
	skillsRefusal,
	type SkillChoice,
	type SkillFormValues,
} from "@/features/people/skills";
import { useSkillSuggestions } from "@/features/people/useSkills";

export type SkillDialogProps = {
	companyId: string;
	/** Who the skill is for, for the dialog's description. */
	name: string;
	/** The skills they have now; the new one is added after these. */
	skills: ReadonlyArray<SkillValue>;
	/**
	 * Adds the skill. A rejection is explained on the dialog's fields or as
	 * its alert, read as a refusal of the whole set with the new skill last.
	 */
	onSubmit: (skill: SkillValue) => Promise<void>;
	onClose: () => void;
};

const FIELDS = ["name", "proficiency"] as const;
const key = "people.skills.dialog";

/**
 * Adds one skill to a person: one of the company's skill names, offered as
 * the name is typed, or a new one, and how well they do it. A skill they
 * already have can't be added twice. Mount when opened and unmount when
 * closed so every attempt starts fresh.
 */
export const SkillDialog = ({
	companyId,
	name,
	skills,
	onSubmit,
	onClose,
}: SkillDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const formId = useId();
	const nameId = `${formId}-name`;
	const proficiencyId = `${formId}-proficiency`;
	const schema = useMemo(
		() =>
			skillFormSchema(
				t,
				skills.map((skill) => skill.name)
			),
		[t, skills]
	);
	const form = useForm<SkillFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { name: "", proficiency: DEFAULT_PROFICIENCY },
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = form;
	const chosen = useWatch({ control, name: "name" });
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	const [query, setQuery] = useState("");
	const suggestions = useSkillSuggestions(companyId, query);
	const nameError = errors.name?.message;
	const proficiencyError = errors.proficiency?.message;
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			description={t(`${key}.description`, { name })}
			formId={formId}
			message={submit.message}
			submitDisabled={!chosen}
			submitLabel={t(`${key}.submit`)}
			submitting={isSubmitting}
			title={t(`${key}.title`)}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					await submit.run(
						() => onSubmit(values),
						(refused) => skillsRefusal(refused, t, skills.length)
					);
				})(event)
			}
		>
			<FormRow
				required
				error={nameError}
				hint={t(`${key}.nameHint`)}
				htmlFor={nameId}
				label={t(`${key}.name`)}
				layout="stacked"
			>
				<Controller
					control={control}
					name="name"
					render={({ field }) => (
						<Combobox<SkillChoice>
							ref={field.ref}
							aria-required
							aria-invalid={Boolean(nameError)}
							aria-labelledby={formRowIds(nameId).labelId}
							className="w-full"
							disabled={isSubmitting}
							emptyText={t(`${key}.noResults`)}
							footer={suggestions.isError && t(`${key}.suggestionsFailed`)}
							formatValue={(choice) => choice.name}
							getKey={(choice) => choice.name.toLocaleLowerCase()}
							id={nameId}
							loading={suggestions.isFetching}
							loadingText={t(`${key}.loading`)}
							multiple={false}
							options={skillChoices(suggestions.data?.items ?? [], query)}
							placeholder={t(`${key}.namePlaceholder`)}
							query={query}
							searchPlaceholder={t(`${key}.searchPlaceholder`)}
							status={nameError ? "error" : undefined}
							value={field.value ? { name: field.value, isNew: false } : null}
							aria-describedby={
								nameError
									? formRowIds(nameId).errorId
									: formRowIds(nameId).hintId
							}
							getLabel={(choice) =>
								choice.isNew
									? t(`${key}.new`, { name: choice.name })
									: choice.name
							}
							onQueryChange={setQuery}
							onChange={(choice) => {
								field.onChange(choice?.name ?? "");
							}}
						/>
					)}
				/>
			</FormRow>
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
										? formRowIds(proficiencyId).errorId
										: formRowIds(proficiencyId).hintId
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
		</CreateFormDialog>
	);
};
