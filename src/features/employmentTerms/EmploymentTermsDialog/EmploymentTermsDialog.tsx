import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
	termsPresetsQuery,
	type ApplyChange,
	type EmploymentTermsBody,
	type TermsOverviewItem,
	type TermsPreset,
} from "@/features/employmentTerms/api";
import { ApplyChangeStep } from "@/features/employmentTerms/ApplyChangeStep";
import {
	applyChangeRefusal,
	isHeldRefusal,
	termsSaveRefusal,
} from "@/features/employmentTerms/refusals";
import { valuesOfPreset } from "@/features/employmentTerms/startFrom";
import { suggestedTermsName } from "@/features/employmentTerms/summary";
import {
	needsApplyChoice,
	weekChanges,
} from "@/features/employmentTerms/termsChanges";
import {
	termsBodyOf,
	termsFormSchema,
	termsFormValuesOf,
	typedWeekOf,
	weekFieldsOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";
import { useEmploymentTermsActions } from "@/features/employmentTerms/useEmploymentTermsActions";
import { ExtraHoursPaySection } from "@/features/employmentTerms/EmploymentTermsDialog/ExtraHoursPaySection";
import { TermsMeaningSection } from "@/features/employmentTerms/EmploymentTermsDialog/TermsMeaningSection";
import { WorkingWeekSection } from "@/features/employmentTerms/EmploymentTermsDialog/WorkingWeekSection";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";

/** What a save did, for the list's confirmation. */
export type TermsSaved =
	| { kind: "added" | "saved"; name: string }
	| {
			kind: "changedFromDate";
			name: string;
			fromDate: string;
			/** How many people moved to the new terms. */
			moved: number;
			/** How many people's own hours were cleared, being above the new week. */
			ownHoursCleared: number;
	  };

export type EmploymentTermsDialogProps = {
	companyId: string;
	/** Set to edit terms; without it, new terms start from the first kind of week. */
	editing?: TermsOverviewItem;
	/** Opened from "Change from a date…": the save step starts on that choice. */
	preferFromDate?: boolean;
	onSaved: (saved: TermsSaved) => void;
	onClose: () => void;
};

const FIELDS = [
	"name",
	"description",
	"daysPerWeek",
	"weekHours",
	"restWeekday",
	"overtimeTimes",
	"extraHoursPaidAs",
	"restDayTimes",
	"dayOffTimes",
] as const;

const key = "employmentTerms.dialog";
/**
 * The terms form takes a wide panel (880 px, 1040 px from `lg`), so the form
 * and its read-back sit side by side; on a phone the read-back follows it.
 */
const WIDE_DIALOG_CLASSES = "sm:max-w-220 lg:max-w-260";

type TermsFormProps = {
	companyId: string;
	editing?: TermsOverviewItem;
	/** Values to come back to from the save step. */
	initial?: EmploymentTermsBody;
	/** Whether saving these values first asks how the change applies. */
	needsChoice: (body: EmploymentTermsBody) => boolean;
	/** Moves on to that question with the values. */
	onChoose: (body: EmploymentTermsBody) => void;
	/** Saves straight away; a refusal stays in the form. */
	onSave: (body: EmploymentTermsBody) => Promise<void>;
	/** Opened from "Change from a date…": saving needs a changed working week. */
	fromDateOnly?: boolean;
	onClose: () => void;
};

/**
 * The terms form in three parts: the working week (`WorkingWeekSection`),
 * pay for extra hours (`ExtraHoursPaySection`) and, beside them, what the
 * terms mean (`TermsMeaningSection`). It holds the form, the starting point
 * and the suggested name, and saves.
 */
const TermsForm = ({
	companyId,
	editing,
	initial,
	needsChoice,
	onChoose,
	onSave,
	fromDateOnly = false,
	onClose,
}: TermsFormProps): FunctionComponent => {
	const { t } = useTranslation();
	const [unchangedWeek, setUnchangedWeek] = useState(false);
	const formId = useId();
	const idOf = (field: string): string => `${formId}-${field}`;
	// The country's figures (part-time line, longest normal day, the Act's rates) and the starting points.
	const presets = useQuery(termsPresetsQuery(companyId));
	const reference = presets.data;
	const presetList = useMemo(() => presets.data?.presets ?? [], [presets.data]);
	const partTimeBelowMinutes = presets.data?.partTimeBelowMinutes ?? null;
	const maxDayMinutes = presets.data?.maxNormalDayMinutes ?? null;
	const minimumCoveredOvertimePercent =
		presets.data?.minimumCoveredOvertimePercent ?? null;
	// The name follows the answers until someone types one; existing terms keep theirs.
	const [nameTyped, setNameTyped] = useState(
		editing !== undefined || initial !== undefined
	);
	// The starting point last clicked (new terms start from the first); it steps aside once an answer differs.
	const [startedFromKey, setStartedFromKey] = useState<string>();
	const isNew = editing === undefined && initial === undefined;
	const schema = useMemo(
		() => termsFormSchema(t, { maxDayMinutes, minimumCoveredOvertimePercent }),
		[t, maxDayMinutes, minimumCoveredOvertimePercent]
	);
	const form = useForm<TermsFormValues>({
		resolver: zodResolver(schema),
		defaultValues: termsFormValuesOf(initial ?? editing),
		// A field is checked as soon as it is left, so a wrong value is said at the field at once.
		mode: "onTouched",
		reValidateMode: "onChange",
	});
	const {
		control,
		handleSubmit,
		reset,
		setValue,
		formState: { isSubmitting },
	} = form;
	const values = useWatch({ control }) as TermsFormValues;
	// Destructured, as the constraint and shift dialogs do, so the alert's ref is never read during render.
	const {
		message: submitMessage,
		alertRef,
		close,
		run,
	} = useCreateFormSubmit(form, FIELDS, onClose);
	const held = (editing?.holderCount ?? 0) + (editing?.scheduledCount ?? 0);

	const startedFrom = presetList.find(
		(preset) =>
			preset.key ===
			(startedFromKey ?? (isNew ? presetList[0]?.key : undefined))
	);
	// Fills the form from a starting point; the name follows unless one was typed.
	const fillFrom = (preset: TermsPreset): void => {
		const next = valuesOfPreset(preset, values);
		reset(next);
		const week = weekFieldsOf(next);
		if (!nameTyped && week)
			setValue("name", suggestedTermsName(week, partTimeBelowMinutes, t));
	};
	const startFrom = (preset: TermsPreset): void => {
		fillFrom(preset);
		setStartedFromKey(preset.key);
	};
	// New terms start from the first starting point once the figures arrive, so the form is never blank.
	const started = useRef(editing !== undefined || initial !== undefined);
	useEffect(() => {
		if (started.current || presetList.length === 0) return;
		started.current = true;
		const [first] = presetList;
		if (first) fillFrom(first);
		// fillFrom reads the form as it is now; it runs once, when the presets arrive.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [presetList]);

	const followAnswers = (next: Partial<TermsFormValues>): void => {
		if (nameTyped) return;
		const week = weekFieldsOf({ ...values, ...next });
		if (week)
			setValue("name", suggestedTermsName(week, partTimeBelowMinutes, t));
	};
	const week = typedWeekOf(values, partTimeBelowMinutes);
	const formMessage =
		submitMessage ?? (unchangedWeek ? t(`${key}.weekUnchanged`) : undefined);
	return (
		<Dialog
			open
			className={WIDE_DIALOG_CLASSES}
			preventClose={isSubmitting}
			title={t(editing ? `${key}.editTitle` : `${key}.addTitle`)}
			description={
				editing
					? [
							t(`${key}.editDescription`, { name: editing.name }),
							// Who holds them is said here, so the form keeps its room.
							...(held > 0 ? [t(`${key}.held`, { count: held })] : []),
						].join(" ")
					: t(`${key}.addDescription`)
			}
			footer={
				<div className="flex justify-end gap-3">
					<Button disabled={isSubmitting} variant="secondary" onClick={close}>
						{t(`${key}.cancel`)}
					</Button>
					<Button form={formId} loading={isSubmitting} type="submit">
						{t(editing ? `${key}.save` : `${key}.add`)}
					</Button>
				</div>
			}
			onClose={close}
		>
			<div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
				<form
					noValidate
					aria-busy={isSubmitting}
					className="flex flex-col gap-6"
					id={formId}
					onSubmit={(event) =>
						handleSubmit(async (submitted) => {
							const body = termsBodyOf(submitted);
							// "Change from a date…" with the same week has nothing to change from a date.
							const sameWeek =
								fromDateOnly &&
								editing !== undefined &&
								!weekChanges(editing, body);
							setUnchangedWeek(sameWeek);
							if (sameWeek) return;
							if (needsChoice(body)) {
								onChoose(body);
								return;
							}
							await run(
								() => onSave(body),
								(error) => {
									if (!isHeldRefusal(error))
										return termsSaveRefusal(error, submitted.name, t);
									onChoose(body);
									return { fields: {}, refreshMembers: false };
								}
							);
						})(event)
					}
				>
					{formMessage && (
						<p
							ref={alertRef}
							className="text-sm text-error-700"
							role="alert"
							tabIndex={-1}
						>
							{formMessage}
						</p>
					)}
					<WorkingWeekSection
						disabled={isSubmitting}
						form={form}
						idOf={idOf}
						partTimeBelowMinutes={partTimeBelowMinutes}
						values={values}
						week={week}
						startFrom={{
							presets: presetList,
							failed: presets.isError,
							startedFrom,
							onStartFrom: startFrom,
						}}
						onAnswer={followAnswers}
						onNameTyped={() => {
							setNameTyped(true);
						}}
					/>
					<ExtraHoursPaySection
						className="border-t border-neutral-200 pt-6"
						disabled={isSubmitting}
						form={form}
						idOf={idOf}
						presets={presets.data}
						values={values}
						week={week}
						onAnswer={followAnswers}
					/>
				</form>
				<TermsMeaningSection
					className="max-md:border-t max-md:border-neutral-200 max-md:pt-6 md:sticky md:top-0 md:self-start"
					partTime={week.partTime}
					reference={reference}
					values={values}
				/>
			</div>
		</Dialog>
	);
};

/**
 * Adds or edits employment terms: the working week (from a starting point,
 * named from the answers until a name is typed), pay for extra hours, and
 * what the terms mean, read back as the form changes. Saving held terms with
 * a different week asks how the change applies (`ApplyChangeStep`). Mount
 * when opened.
 */
export const EmploymentTermsDialog = ({
	companyId,
	editing,
	preferFromDate,
	onSaved,
	onClose,
}: EmploymentTermsDialogProps): FunctionComponent => {
	const [pending, setPending] = useState<EmploymentTermsBody>();
	const [applyProblem, setApplyProblem] = useState<string>();
	const { t } = useTranslation();
	const actions = useEmploymentTermsActions(companyId);
	const applying =
		actions.correct.isPending || actions.changeFromDate.isPending;
	const refused = (error: unknown, newName?: string): void => {
		setApplyProblem(applyChangeRefusal(error, newName, t));
	};
	if (editing && pending)
		return (
			<ApplyChangeStep
				currentName={editing.name}
				isDefault={editing.isDefault}
				next={pending}
				peopleCount={editing.holderCount + editing.scheduledCount}
				preferFromDate={preferFromDate}
				problem={applyProblem}
				saving={applying}
				onClose={onClose}
				onApply={(apply: ApplyChange) => {
					setApplyProblem(undefined);
					if (apply.mode === "CORRECT") {
						actions.correct.mutate(
							{ termsId: editing.id, body: pending, correctForEveryone: true },
							{
								onSuccess: (terms) => {
									onSaved({ kind: "saved", name: terms.name });
									onClose();
								},
								onError: (error) => {
									refused(error);
								},
							}
						);
						return;
					}
					// The form's name, when changed, renames the terms left behind; the new ones take the step's name.
					const renamed = pending.name !== editing.name;
					actions.changeFromDate.mutate(
						{
							termsId: editing.id,
							startsOn: apply.startsOn,
							newTerms: { ...pending, name: apply.newName },
							...(renamed ? { previousTermsName: pending.name } : {}),
						},
						{
							onSuccess: (change) => {
								onSaved({
									kind: "changedFromDate",
									name: change.newTerms.name,
									fromDate: apply.startsOn,
									moved: change.moved,
									ownHoursCleared: change.ownHoursCleared,
								});
								onClose();
							},
							onError: (error) => {
								refused(error, apply.newName);
							},
						}
					);
				}}
				onBack={() => {
					setApplyProblem(undefined);
					setPending(undefined);
				}}
			/>
		);
	return (
		<TermsForm
			companyId={companyId}
			editing={editing}
			fromDateOnly={preferFromDate}
			initial={pending}
			needsChoice={(body) =>
				editing !== undefined && needsApplyChoice(editing, body)
			}
			onChoose={setPending}
			onClose={onClose}
			onSave={async (body) => {
				if (editing) {
					const terms = await actions.correct.mutateAsync({
						termsId: editing.id,
						body,
					});
					onSaved({ kind: "saved", name: terms.name });
					return;
				}
				const created = await actions.create.mutateAsync(body);
				onSaved({ kind: "added", name: created.name });
			}}
		/>
	);
};
