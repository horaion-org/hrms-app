import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DatePicker } from "@/components/forms/DatePicker";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Slider } from "@/components/forms/Slider";
import { Textarea } from "@/components/forms/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { SearchIcon } from "@/components/ui/Icon";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { mapRefusal } from "@/features/organisation/refusal";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { PROFILE_REFUSAL_CODES } from "@/features/people/profileRefusal";
import {
	DEFAULT_PROFICIENCY,
	PROFICIENCY_MAX,
	PROFICIENCY_MIN,
	SKILL_NOTES_MAX_LENGTH,
} from "@/features/people/skills";
import {
	BULK_ASSIGN_MAX_PEOPLE,
	type AssignablePerson,
	type BulkAssignResult,
	type SkillOverview,
} from "@/features/skills/api";
import {
	bulkAssignBodyOf,
	bulkAssignSchema,
	type BulkAssignValues,
} from "@/features/skills/BulkAssignSkillDialog/schema";
import { prefillExpiry } from "@/features/skills/skillRules";
import {
	useAssignablePeople,
	useAssignSkill,
	useSkillHolders,
} from "@/features/skills/useBulkAssign";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";

export type BulkAssignSkillDialogProps = {
	companyId: string;
	/** An active skill. */
	skill: SkillOverview;
	/** Called with what the assignment did, once it is saved. */
	onAssigned: (result: BulkAssignResult) => void;
	onClose: () => void;
};

const FIELDS = ["proficiency", "notes", "expiresOn"] as const;
const UPDATE_KEYS = ["member_profile:update"] as const;
const key = "organisation.skills.assign";

/**
 * Gives one skill to many people at once: search them by name, narrow them
 * to a Department, tick them (up to 500, everyone listed with the header
 * box), and set what they all get. People who already hold it are marked
 * and left as they are unless "overwrite" is ticked. Mount when opened and
 * unmount when closed so every attempt starts fresh.
 */
export const BulkAssignSkillDialog = ({
	companyId,
	skill,
	onAssigned,
	onClose,
}: BulkAssignSkillDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const formId = useId();
	const searchId = `${formId}-search`;
	const departmentId = `${formId}-department`;
	const proficiencyId = `${formId}-proficiency`;
	const issuedOnId = `${formId}-issued-on`;
	const expiresOnId = `${formId}-expires-on`;
	const notesId = `${formId}-notes`;
	const rated = skill.proficiencyScale === "ONE_TO_TEN";
	const [search, setSearch] = useState("");
	const [department, setDepartment] = useState("");
	const [selectedIds, setSelectedIds] = useState<Array<string>>([]);
	const people = useAssignablePeople(
		companyId,
		search,
		department || undefined
	);
	const holders = useSkillHolders(
		companyId,
		skill.skillId,
		department || undefined
	);
	const schema = useMemo(
		() => bulkAssignSchema(t, skill.tracksExpiry),
		[t, skill.tracksExpiry]
	);
	const form = useForm<BulkAssignValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			proficiency: DEFAULT_PROFICIENCY,
			notes: "",
			issuedOn: "",
			expiresOn: "",
			overwrite: false,
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
	const assign = useAssignSkill(companyId, skill.skillId);
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	const columns = useMemo(
		(): Array<DataTableColumn<AssignablePerson>> => [
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
				cell: (person) =>
					person.departmentName ?? t("organisation.skills.none"),
			},
			{
				id: "held",
				header: t(`${key}.held`),
				cell: (person): ReactNode => {
					const holding = holders.data?.get(person.membershipId);
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
		],
		[t, holders.data]
	);
	const listed = people.data?.items ?? [];
	const total = people.data?.total ?? 0;
	const proficiencyError = errors.proficiency?.message;
	const expiresOnError = errors.expiresOn?.message;
	const notesError = errors.notes?.message;
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			className="max-w-200"
			description={t(`${key}.description`, { name: skill.name })}
			formId={formId}
			message={submit.message}
			submitDisabled={selectedIds.length === 0}
			submitLabel={t(`${key}.submit`, { count: selectedIds.length })}
			submitting={isSubmitting}
			title={t(`${key}.title`, { name: skill.name })}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					await submit.run(
						async () => {
							onAssigned(
								await assign.mutateAsync(
									bulkAssignBodyOf(values, skill, selectedIds)
								)
							);
						},
						(error) =>
							mapRefusal<(typeof FIELDS)[number]>(error, {
								alerts: {
									"429 RATE_LIMITED": t(`${key}.rateLimited`),
									"409 SKILL_INACTIVE": t(`${key}.inactive`),
									"404 SKILL_NOT_FOUND": t("organisation.skills.dialog.gone"),
									[PROFILE_REFUSAL_CODES.profileNotFound]: t(
										`${key}.personGone`
									),
								},
								fieldErrors: {
									proficiency: {
										field: "proficiency",
										message: t("people.skills.dialog.proficiencyRejected"),
									},
									expiresOn: {
										field: "expiresOn",
										message: t(`${key}.expiresOnRequired`),
									},
									notes: {
										field: "notes",
										message: t("people.skills.dialog.notesLength"),
									},
								},
								forbidden: t(`${key}.forbidden`),
								failed: t(`${key}.failed`),
							})
					);
				})(event)
			}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<FormRow htmlFor={searchId} label={t(`${key}.search`)} layout="stacked">
					<Input
						className="w-full"
						id={searchId}
						leadingIcon={<SearchIcon />}
						placeholder={t(`${key}.searchPlaceholder`)}
						type="search"
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
						}}
					/>
				</FormRow>
				<FormRow
					htmlFor={departmentId}
					label={t(`${key}.department`)}
					layout="stacked"
				>
					<DepartmentSelector
						aria-labelledby={formRowIds(departmentId).labelId}
						className="w-full"
						companyId={companyId}
						emptyLabel={t(`${key}.allDepartments`)}
						keys={UPDATE_KEYS}
						placeholder={t(`${key}.allDepartments`)}
						value={department}
						onChange={setDepartment}
					/>
				</FormRow>
			</div>
			{people.isError ? (
				<p className="text-sm text-error-700" role="alert">
					{t(`${key}.peopleFailed`)}
				</p>
			) : (
				<div className="space-y-2">
					<DataTable
						className="max-h-80 overflow-y-auto"
						columns={columns}
						data={listed}
						getRowId={(person) => person.membershipId}
						label={t(`${key}.people`)}
						emptyState={
							people.isPending ? t(`${key}.loading`) : t(`${key}.noPeople`)
						}
						selection={{
							rowLabel: (person) => person.displayName,
							selectedIds,
							onChange: setSelectedIds,
						}}
					/>
					<p className="text-sm text-neutral-700" role="status">
						{total > BULK_ASSIGN_MAX_PEOPLE
							? t(`${key}.capped`, {
									count: BULK_ASSIGN_MAX_PEOPLE,
									total,
								})
							: t(`${key}.selected`, { count: selectedIds.length })}
					</p>
				</div>
			)}
			{rated && (
				<FormRow
					required
					error={proficiencyError}
					hint={t("people.skills.dialog.proficiencyHint")}
					htmlFor={proficiencyId}
					label={t("people.skills.dialog.proficiency")}
					layout="stacked"
				>
					<Controller
						control={control}
						name="proficiency"
						render={({ field }) => (
							<span className="flex items-center gap-4">
								<Slider
									ref={field.ref}
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
			)}
			{skill.tracksExpiry && (
				<div className="grid gap-6 sm:grid-cols-2">
					<FormRow
						htmlFor={issuedOnId}
						label={t("people.skills.dialog.issuedOn")}
						layout="stacked"
					>
						<Controller
							control={control}
							name="issuedOn"
							render={({ field }) => (
								<DatePicker
									ref={field.ref}
									clearable
									aria-labelledby={formRowIds(issuedOnId).labelId}
									className="w-full"
									disabled={isSubmitting}
									id={issuedOnId}
									label={t("people.skills.dialog.issuedOn")}
									mode="single"
									name={field.name}
									placeholder={t("people.skills.dialog.datePlaceholder")}
									value={field.value}
									onBlur={field.onBlur}
									onChange={(issuedOn) => {
										field.onChange(issuedOn);
										// The skill's validity fills in an expiry not given yet.
										if (
											issuedOn &&
											skill.validityMonths &&
											!getValues("expiresOn")
										)
											setValue(
												"expiresOn",
												prefillExpiry(issuedOn, skill.validityMonths)
											);
									}}
								/>
							)}
						/>
					</FormRow>
					<FormRow
						required
						error={expiresOnError}
						hint={t("people.skills.dialog.expiresOnHint")}
						htmlFor={expiresOnId}
						label={t("people.skills.dialog.expiresOn")}
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
									aria-labelledby={formRowIds(expiresOnId).labelId}
									className="w-full"
									disabled={isSubmitting}
									id={expiresOnId}
									label={t("people.skills.dialog.expiresOn")}
									mode="single"
									name={field.name}
									placeholder={t("people.skills.dialog.datePlaceholder")}
									status={expiresOnError ? "error" : undefined}
									value={field.value}
									aria-describedby={
										expiresOnError
											? formRowIds(expiresOnId).errorId
											: formRowIds(expiresOnId).hintId
									}
									onBlur={field.onBlur}
									onChange={field.onChange}
								/>
							)}
						/>
					</FormRow>
				</div>
			)}
			<FormRow
				error={notesError}
				hint={t(`${key}.notesHint`)}
				htmlFor={notesId}
				label={t("people.skills.dialog.notes")}
				layout="stacked"
				counter={t("people.skills.dialog.notesCounter", {
					count: notes.length,
				})}
			>
				<Textarea
					aria-invalid={Boolean(notesError)}
					className="w-full"
					disabled={isSubmitting}
					id={notesId}
					maxLength={SKILL_NOTES_MAX_LENGTH}
					rows={2}
					status={notesError ? "error" : undefined}
					aria-describedby={
						notesError
							? formRowIds(notesId).errorId
							: formRowIds(notesId).hintId
					}
					{...register("notes")}
				/>
			</FormRow>
			<Controller
				control={control}
				name="overwrite"
				render={({ field }) => (
					<Checkbox
						checked={field.value}
						description={t(`${key}.overwriteDescription`)}
						disabled={isSubmitting}
						label={t(`${key}.overwrite`)}
						name={field.name}
						onBlur={field.onBlur}
						onChange={(event) => {
							field.onChange(event.target.checked);
						}}
					/>
				)}
			/>
		</CreateFormDialog>
	);
};
