import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { RadioCard } from "@/components/forms/RadioCard";
import { Textarea } from "@/components/forms/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import {
	PROFICIENCY_SCALES,
	SKILL_CATEGORY_MAX_LENGTH,
	SKILL_DESCRIPTION_MAX_LENGTH,
	SKILL_VALIDITY_MAX_MONTHS,
	type SkillOverview,
} from "@/features/skills/api";
import { refusalFor } from "@/features/skills/SkillSettingsDialog/refusalFor";
import {
	initialSkillValues,
	skillBodyOf,
	skillSettingsSchema,
	type SkillSettingsValues,
} from "@/features/skills/SkillSettingsDialog/schema";
import {
	useCreateSkill,
	useUpdateSkill,
} from "@/features/skills/useSkillCatalogue";

export type SkillSettingsDialogProps = {
	companyId: string;
	/** Set to edit an existing skill; its status stays as it is. */
	editing?: SkillOverview;
	onClose: () => void;
};

const FIELDS = ["name", "category", "description", "validityMonths"] as const;
const key = "organisation.skills.dialog";

/**
 * Creates a skill in the company's catalogue, or edits one: its name,
 * category, description, how holders are measured and whether they record
 * an expiry. While anyone holds the skill, how it is measured and expiry
 * tracking are fixed, as the API keeps them. Mount when opened and unmount
 * when closed so every attempt starts fresh.
 */
export const SkillSettingsDialog = ({
	companyId,
	editing,
	onClose,
}: SkillSettingsDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const formId = useId();
	const categoryId = `${formId}-category`;
	const categoryIds = formRowIds(categoryId);
	const descriptionId = `${formId}-description`;
	const descriptionIds = formRowIds(descriptionId);
	const validityId = `${formId}-validity`;
	const validityIds = formRowIds(validityId);
	const measureLabelId = `${formId}-measure-label`;
	const measureHintId = `${formId}-measure-hint`;
	const schema = useMemo(() => skillSettingsSchema(t), [t]);
	const form = useForm<SkillSettingsValues>({
		resolver: zodResolver(schema),
		defaultValues: initialSkillValues(editing),
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = form;
	const name = useWatch({ control, name: "name" });
	const category = useWatch({ control, name: "category" });
	const description = useWatch({ control, name: "description" });
	const tracksExpiry = useWatch({ control, name: "tracksExpiry" });
	const create = useCreateSkill(companyId);
	const update = useUpdateSkill(companyId);
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	// The API refuses to change these while anyone holds the skill, so they are not offered.
	const measureFixed = (editing?.holders ?? 0) > 0;
	const categoryError = errors.category?.message;
	const descriptionError = errors.description?.message;
	const validityError = errors.validityMonths?.message;
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			formId={formId}
			message={submit.message}
			submitDisabled={!name.trim()}
			submitLabel={t(editing ? `${key}.editSubmit` : `${key}.submit`)}
			submitting={isSubmitting}
			title={t(editing ? `${key}.editTitle` : `${key}.title`)}
			description={
				editing
					? t(`${key}.editDescription`, { name: editing.name })
					: t(`${key}.description`)
			}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					const body = skillBodyOf(values);
					await submit.run(
						() =>
							editing
								? update.mutateAsync({
										skillId: editing.skillId,
										// The status changes from the row's menu, never here.
										body: {
											...body,
											status:
												editing.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
										},
									})
								: create.mutateAsync(body),
						(error) => refusalFor(error, values.name, editing !== undefined, t)
					);
				})(event)
			}
		>
			<UnitNameField
				autoFocus
				counter={t(`${key}.nameCounter`, { count: name.length })}
				disabled={isSubmitting}
				error={errors.name?.message}
				hint={t(`${key}.nameHint`)}
				id={`${formId}-name`}
				label={t(`${key}.name`)}
				placeholder={t(`${key}.namePlaceholder`)}
				registration={register("name")}
			/>
			<FormRow
				counter={t(`${key}.categoryCounter`, { count: category.length })}
				error={categoryError}
				hint={t(`${key}.categoryHint`)}
				htmlFor={categoryId}
				label={t(`${key}.category`)}
				layout="stacked"
			>
				<Input
					aria-invalid={Boolean(categoryError)}
					className="w-full"
					disabled={isSubmitting}
					id={categoryId}
					maxLength={SKILL_CATEGORY_MAX_LENGTH}
					placeholder={t(`${key}.categoryPlaceholder`)}
					status={categoryError ? "error" : undefined}
					aria-describedby={
						categoryError ? categoryIds.errorId : categoryIds.hintId
					}
					{...register("category")}
				/>
			</FormRow>
			<FormRow
				counter={t(`${key}.descriptionCounter`, { count: description.length })}
				error={descriptionError}
				htmlFor={descriptionId}
				label={t(`${key}.descriptionLabel`)}
				layout="stacked"
			>
				<Textarea
					aria-describedby={descriptionError && descriptionIds.errorId}
					aria-invalid={Boolean(descriptionError)}
					disabled={isSubmitting}
					id={descriptionId}
					maxLength={SKILL_DESCRIPTION_MAX_LENGTH}
					placeholder={t(`${key}.descriptionPlaceholder`)}
					rows={3}
					status={descriptionError ? "error" : undefined}
					{...register("description")}
				/>
			</FormRow>
			<Controller
				control={control}
				name="proficiencyScale"
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<p className="text-sm text-neutral-800" id={measureLabelId}>
							{t(`${key}.measure`)}
						</p>
						<div
							aria-describedby={measureFixed ? measureHintId : undefined}
							aria-labelledby={measureLabelId}
							className="grid gap-4 sm:grid-cols-2"
							role="radiogroup"
						>
							{PROFICIENCY_SCALES.map((scale) => (
								<RadioCard
									key={scale}
									checked={field.value === scale}
									description={t(`${key}.measureDescription.${scale}`)}
									disabled={isSubmitting || measureFixed}
									label={t(`${key}.measureLabel.${scale}`)}
									name={`${formId}-measure`}
									value={scale}
									onChange={field.onChange}
								/>
							))}
						</div>
						{measureFixed && (
							<p className="text-xs text-neutral-600" id={measureHintId}>
								{t(`${key}.fixedWhileHeld`)}
							</p>
						)}
					</div>
				)}
			/>
			<Controller
				control={control}
				name="tracksExpiry"
				render={({ field }) => (
					<Checkbox
						checked={field.value}
						description={t(`${key}.tracksExpiryDescription`)}
						disabled={isSubmitting || measureFixed}
						label={t(`${key}.tracksExpiry`)}
						name={field.name}
						onBlur={field.onBlur}
						onChange={(event) => {
							field.onChange(event.target.checked);
						}}
					/>
				)}
			/>
			{tracksExpiry && (
				<FormRow
					error={validityError}
					hint={t(`${key}.validityHint`)}
					htmlFor={validityId}
					label={t(`${key}.validity`)}
					layout="stacked"
				>
					<Input
						aria-invalid={Boolean(validityError)}
						className="w-40"
						disabled={isSubmitting}
						id={validityId}
						inputMode="numeric"
						max={SKILL_VALIDITY_MAX_MONTHS}
						min={1}
						status={validityError ? "error" : undefined}
						type="number"
						aria-describedby={
							validityError ? validityIds.errorId : validityIds.hintId
						}
						{...register("validityMonths")}
					/>
				</FormRow>
			)}
		</CreateFormDialog>
	);
};
