import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	DeleteIcon,
	PlusIcon,
} from "@/components/ui/Icon";
import {
	APPROVAL_FLOW_MAX_STEPS,
	APPROVAL_STEP_LABEL_INPUT_MAX_LENGTH,
	LEAVE_REQUEST,
	type ApprovalFlow,
	type ApprovalSubject,
} from "@/features/approvals/api";
import { flowRefusal } from "@/features/approvals/approvalRefusal";
import { subjectCopyKey } from "@/features/approvals/approvalSubjects";
import {
	movedFocusTarget,
	type MoveDirection,
} from "@/features/approvals/ApprovalFlowDialog/movedFocusTarget";
import { StepChoices } from "@/features/approvals/ApprovalFlowDialog/StepChoices";
import {
	flowSchema,
	initialFlowValues,
	newStep,
	type FlowValues,
} from "@/features/approvals/ApprovalFlowDialog/schema";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";

export type ApprovalFlowDialogProps = {
	companyId: string;
	/** What the flow approves; fixed by the Settings group that opened the dialog. */
	subjectType: ApprovalSubject;
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

/**
 * Adds or edits an approval flow for one subject (a roster's publication or
 * a leave request): where it applies (the company default or one
 * department, fixed once added), its name, and up to three steps in order.
 * Each step is named and decided by anyone who holds the subject's review
 * permission there, or only by named people: any one of them, or all of
 * them. With two steps or more, each step can require a different person.
 * Steps move with up and down buttons, and each move is announced. Mount
 * when opened and unmount when closed.
 */
export const ApprovalFlowDialog = ({
	companyId,
	subjectType,
	editing,
	departmentName,
	onSave,
	onClose,
}: ApprovalFlowDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const formId = useId();
	const schema = useMemo(() => flowSchema(t), [t]);
	const subjectKey = subjectCopyKey(subjectType);
	const companyDefault = t("approvals.flows.companyDefault");
	const defaultNameFor = (departmentId: string): string =>
		departmentId === ""
			? t(`${subjectKey}.defaultCompanyName`)
			: t(`${subjectKey}.defaultName`, {
					unit: departmentName(departmentId) ?? "",
				});
	const form = useForm<FlowValues>({
		resolver: zodResolver(schema),
		defaultValues: initialFlowValues(editing, {
			formerMember: t("approvals.trail.formerMember"),
			newName: defaultNameFor(""),
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
	const moved = useRef<{ index: number; direction: MoveDirection } | null>(
		null
	);
	const stepsRef = useRef<HTMLOListElement>(null);
	useEffect(() => {
		const last = moved.current;
		if (!last) return;
		moved.current = null;
		const direction = movedFocusTarget(
			last.index,
			last.direction,
			steps.fields.length - 1
		);
		stepsRef.current
			?.querySelector<HTMLButtonElement>(
				`[data-move="${last.index}:${direction}"]`
			)
			?.focus();
	}, [steps.fields]);
	const stepCount = steps.fields.length;
	const anyoneLabel =
		departmentId === ""
			? t(`${subjectKey}.anyoneCompany`)
			: t(`${subjectKey}.anyone`, {
					department: departmentName(departmentId) ?? "",
				});
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
			description={t(`${subjectKey}.dialogDescription`)}
			formId={formId}
			message={submit.message}
			submitLabel={t(`${key}.submit`)}
			submitting={isSubmitting}
			title={t(
				editing ? `${subjectKey}.dialogEditTitle` : `${subjectKey}.dialogTitle`
			)}
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
							emptyLabel={companyDefault}
							keys={["approval_flow:read"]}
							placeholder={companyDefault}
							status={errors.departmentId ? "error" : undefined}
							value={field.value}
							onChange={(next) => {
								field.onChange(next);
								// A name nobody typed follows where the flow applies.
								if (!getFieldState("name").isDirty)
									setValue("name", defaultNameFor(next));
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
								departmentId={departmentId}
								disabled={isSubmitting}
								idPrefix={idPrefix}
								index={index}
								peopleError={errors.steps?.[index]?.members?.message}
								peopleHint={t(`${subjectKey}.peopleHint`)}
								subjectType={subjectType}
							/>
						</li>
					);
				})}
			</ol>
			<p aria-live="polite" className="sr-only">
				{announcement}
			</p>
			{stepCount < APPROVAL_FLOW_MAX_STEPS ? (
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
			{stepCount > 1 && (
				<Controller
					control={control}
					name="distinctApprovers"
					render={({ field }) => (
						<Checkbox
							checked={field.value}
							description={t(`${key}.distinctDescription`)}
							disabled={isSubmitting}
							label={t(`${key}.distinct`)}
							onChange={(event) => {
								field.onChange(event.target.checked);
							}}
						/>
					)}
				/>
			)}
			{/* A leave flow nobody can approve stops applications there, so it is a warning. */}
			<Callout tone={subjectType === LEAVE_REQUEST ? "warning" : "info"}>
				{t(`${subjectKey}.info`)}
			</Callout>
		</CreateFormDialog>
	);
};
