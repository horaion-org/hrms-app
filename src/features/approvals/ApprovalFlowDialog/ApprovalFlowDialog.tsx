import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	Controller,
	useFieldArray,
	useForm,
	useWatch,
	type Control,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { RadioCard } from "@/components/forms/RadioCard";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	DeleteIcon,
	PlusIcon,
} from "@/components/ui/Icon";
import {
	APPROVAL_FLOW_MAX_STEPS,
	APPROVAL_STEP_LABEL_INPUT_MAX_LENGTH,
	APPROVAL_STEP_MAX_MEMBERS,
	type ApprovalFlow,
} from "@/features/approvals/api";
import { flowRefusal } from "@/features/approvals/approvalRefusal";
import {
	flowSchema,
	initialFlowValues,
	newStep,
	type FlowValues,
} from "@/features/approvals/ApprovalFlowDialog/schema";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { HeadsField } from "@/features/organisation/HeadsField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";

export type ApprovalFlowDialogProps = {
	companyId: string;
	/** Set to edit a flow; where it applies is then fixed. */
	editing?: ApprovalFlow;
	/** Names a department by its id, for the "anyone who can publish" choice. */
	departmentName: (departmentId: string) => string | undefined;
	/** Saves the flow; a refusal is shown in the dialog. */
	onSave: (values: FlowValues) => Promise<unknown>;
	onClose: () => void;
};

const FIELDS = ["departmentId"] as const;
const key = "approvals.flows.dialog";

/** One step's "who decides" and, for named people, "how many of them". */
const StepChoices = ({
	companyId,
	control,
	index,
	idPrefix,
	anyoneLabel,
	disabled,
	peopleError,
}: {
	companyId: string;
	control: Control<FlowValues>;
	index: number;
	idPrefix: string;
	anyoneLabel: string;
	disabled: boolean;
	peopleError?: string;
}): FunctionComponent => {
	const { t } = useTranslation();
	const rule = useWatch({ control, name: `steps.${index}.rule` });
	return (
		<>
			<Controller
				control={control}
				name={`steps.${index}.rule`}
				render={({ field }) => (
					<div className="flex flex-col gap-2">
						<p className="text-sm text-neutral-800" id={`${idPrefix}-who`}>
							{t(`${key}.whoDecides`)}
						</p>
						<div
							aria-labelledby={`${idPrefix}-who`}
							className="grid gap-3"
							role="radiogroup"
						>
							<RadioCard
								checked={field.value === "KEY_HOLDERS"}
								description={t(`${key}.anyoneDescription`)}
								disabled={disabled}
								label={anyoneLabel}
								name={`${idPrefix}-rule`}
								value="KEY_HOLDERS"
								onChange={field.onChange}
							/>
							<RadioCard
								checked={field.value === "MEMBERS"}
								description={t(`${key}.onlyTheseDescription`)}
								disabled={disabled}
								label={t(`${key}.onlyThese`)}
								name={`${idPrefix}-rule`}
								value="MEMBERS"
								onChange={field.onChange}
							/>
						</div>
					</div>
				)}
			/>
			{rule === "MEMBERS" && (
				<>
					<Controller
						control={control}
						name={`steps.${index}.members`}
						render={({ field }) => (
							<HeadsField
								ref={field.ref}
								companyId={companyId}
								disabled={disabled}
								error={peopleError}
								hint={t(`${key}.peopleHint`)}
								id={`${idPrefix}-people`}
								label={t(`${key}.people`)}
								max={APPROVAL_STEP_MAX_MEMBERS}
								placeholder={t(`${key}.peoplePlaceholder`)}
								value={field.value}
								onChange={field.onChange}
							/>
						)}
					/>
					<Controller
						control={control}
						name={`steps.${index}.quorum`}
						render={({ field }) => (
							<div className="flex flex-col gap-2">
								<p className="text-sm text-neutral-800" id={`${idPrefix}-how`}>
									{t(`${key}.how`)}
								</p>
								<div
									aria-labelledby={`${idPrefix}-how`}
									className="grid gap-3 sm:grid-cols-2"
									role="radiogroup"
								>
									<RadioCard
										checked={field.value === "ANY"}
										disabled={disabled}
										label={t(`${key}.any`)}
										name={`${idPrefix}-quorum`}
										value="ANY"
										onChange={field.onChange}
									/>
									<RadioCard
										checked={field.value === "ALL"}
										disabled={disabled}
										label={t(`${key}.all`)}
										name={`${idPrefix}-quorum`}
										value="ALL"
										onChange={field.onChange}
									/>
								</div>
							</div>
						)}
					/>
				</>
			)}
		</>
	);
};

/**
 * Adds or edits an approval flow for schedule publishing: where it applies
 * (the whole company or one department, fixed once added), its name, and up
 * to three steps in order. Each step is named and decided by anyone who can
 * publish the roster there, or only by named people: any one of them, or
 * all of them. Steps move with up and down buttons, and each move is
 * announced. Mount when opened and unmount when closed.
 */
export const ApprovalFlowDialog = ({
	companyId,
	editing,
	departmentName,
	onSave,
	onClose,
}: ApprovalFlowDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const formId = useId();
	const schema = useMemo(() => flowSchema(t), [t]);
	const form = useForm<FlowValues>({
		resolver: zodResolver(schema),
		defaultValues: initialFlowValues(editing, {
			formerMember: t("approvals.trail.formerMember"),
			newName: t(`${key}.defaultName`, {
				unit: t("approvals.flows.wholeCompany"),
			}),
		}),
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		control,
		register,
		handleSubmit,
		setValue,
		getFieldState,
		formState: { errors, isSubmitting },
	} = form;
	const steps = useFieldArray({ control, name: "steps" });
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	const departmentId = useWatch({ control, name: "departmentId" });
	const [announcement, setAnnouncement] = useState("");
	// The arrow a move was made with; focus follows the moved step to its new place.
	const moved = useRef<{ index: number; direction: "up" | "down" } | null>(
		null
	);
	const stepsRef = useRef<HTMLOListElement>(null);
	useEffect(() => {
		const last = moved.current;
		if (!last) return;
		moved.current = null;
		const lastIndex = steps.fields.length - 1;
		// At an end the pressed arrow is gone from use; keep focus on the other one.
		const direction =
			(last.direction === "up" && last.index === 0) ||
			(last.direction === "down" && last.index === lastIndex)
				? last.direction === "up"
					? "down"
					: "up"
				: last.direction;
		stepsRef.current
			?.querySelector<HTMLButtonElement>(
				`[data-move="${last.index}:${direction}"]`
			)
			?.focus();
	}, [steps.fields]);
	const unitName =
		departmentId === ""
			? t("approvals.flows.wholeCompany")
			: (departmentName(departmentId) ?? "");
	const anyoneLabel =
		departmentId === ""
			? t(`${key}.anyoneCompany`)
			: t(`${key}.anyone`, { department: unitName });
	const move = (index: number, direction: "up" | "down"): void => {
		const to = direction === "up" ? index - 1 : index + 1;
		if (to < 0 || to >= steps.fields.length || isSubmitting) return;
		moved.current = { index: to, direction };
		steps.move(index, to);
		setAnnouncement(t(`${key}.moved`, { from: index + 1, to: to + 1 }));
	};

	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			description={t(`${key}.description`)}
			formId={formId}
			message={submit.message}
			submitLabel={t(`${key}.submit`)}
			submitting={isSubmitting}
			title={t(editing ? `${key}.editTitle` : `${key}.title`)}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					await submit.run(
						() => onSave(values),
						(error) => flowRefusal(error, t)
					);
				})(event)
			}
		>
			<Controller
				control={control}
				name="departmentId"
				render={({ field }) => (
					<FormRow
						error={errors.departmentId?.message}
						hint={t(`${key}.appliesToHint`)}
						htmlFor={`${formId}-unit`}
						label={t(`${key}.appliesTo`)}
						layout="stacked"
					>
						<DepartmentSelector
							ref={field.ref}
							activeOnly={!editing}
							aria-label={t(`${key}.appliesTo`)}
							companyId={companyId}
							disabled={isSubmitting || editing !== undefined}
							emptyLabel={t("approvals.flows.wholeCompany")}
							keys={["approval_flow:read"]}
							placeholder={t("approvals.flows.wholeCompany")}
							status={errors.departmentId ? "error" : undefined}
							value={field.value}
							onChange={(next) => {
								field.onChange(next);
								// A name nobody typed follows where the flow applies.
								if (!getFieldState("name").isDirty)
									setValue(
										"name",
										t(`${key}.defaultName`, {
											unit:
												next === ""
													? t("approvals.flows.wholeCompany")
													: (departmentName(next) ?? ""),
										})
									);
							}}
						/>
					</FormRow>
				)}
			/>
			<FormRow
				required
				error={errors.name?.message}
				htmlFor={`${formId}-name`}
				label={t(`${key}.name`)}
				layout="stacked"
			>
				<Input
					className="w-full"
					disabled={isSubmitting}
					id={`${formId}-name`}
					status={errors.name ? "error" : undefined}
					{...register("name")}
				/>
			</FormRow>
			<ol ref={stepsRef} className="flex flex-col gap-6">
				{steps.fields.map((step, index) => {
					const idPrefix = `${formId}-step-${step.id}`;
					const arrow = (direction: "up" | "down"): FunctionComponent => {
						const unavailable =
							direction === "up"
								? index === 0
								: index === steps.fields.length - 1;
						return (
							<Button
								aria-disabled={unavailable || undefined}
								className="aria-disabled:cursor-not-allowed aria-disabled:text-neutral-400"
								data-move={`${index}:${direction}`}
								variant="icon"
								aria-label={t(
									direction === "up" ? `${key}.moveUp` : `${key}.moveDown`,
									{ step: index + 1 }
								)}
								onClick={() => {
									move(index, direction);
								}}
							>
								{direction === "up" ? <ArrowUpIcon /> : <ArrowDownIcon />}
							</Button>
						);
					};
					return (
						<li
							key={step.id}
							className="flex flex-col gap-4 rounded-lg border border-neutral-400 p-4"
						>
							<div className="flex items-center justify-between gap-2">
								<h3 className="text-sm font-semibold text-neutral-900">
									{t(`${key}.step`, { step: index + 1 })}
								</h3>
								<div className="flex shrink-0">
									{arrow("up")}
									{arrow("down")}
									{steps.fields.length > 1 && (
										<Button
											aria-label={t(`${key}.remove`, { step: index + 1 })}
											disabled={isSubmitting}
											variant="icon"
											onClick={() => {
												steps.remove(index);
											}}
										>
											<DeleteIcon />
										</Button>
									)}
								</div>
							</div>
							<FormRow
								required
								error={errors.steps?.[index]?.label?.message}
								hint={t(`${key}.labelHint`)}
								htmlFor={`${idPrefix}-label`}
								label={t(`${key}.stepLabel`, { step: index + 1 })}
								layout="stacked"
							>
								<Input
									className="w-full"
									disabled={isSubmitting}
									id={`${idPrefix}-label`}
									maxLength={APPROVAL_STEP_LABEL_INPUT_MAX_LENGTH}
									placeholder={t(`${key}.labelPlaceholder`)}
									status={errors.steps?.[index]?.label ? "error" : undefined}
									{...register(`steps.${index}.label`)}
								/>
							</FormRow>
							<StepChoices
								anyoneLabel={anyoneLabel}
								companyId={companyId}
								control={control}
								disabled={isSubmitting}
								idPrefix={idPrefix}
								index={index}
								peopleError={errors.steps?.[index]?.members?.message}
							/>
						</li>
					);
				})}
			</ol>
			<p aria-live="polite" className="sr-only">
				{announcement}
			</p>
			{steps.fields.length < APPROVAL_FLOW_MAX_STEPS ? (
				<Button
					disabled={isSubmitting}
					leadingIcon={<PlusIcon />}
					variant="textlink"
					onClick={() => {
						steps.append(newStep());
					}}
				>
					{t(`${key}.addStep`)}
				</Button>
			) : (
				<p className="text-sm text-neutral-700">{t(`${key}.maxSteps`)}</p>
			)}
			<Callout>{t(`${key}.info`)}</Callout>
		</CreateFormDialog>
	);
};
