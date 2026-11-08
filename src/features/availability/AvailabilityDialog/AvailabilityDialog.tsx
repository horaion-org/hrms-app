import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PlusIcon } from "@/components/ui/Icon";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import {
	availabilityFormSchema,
	type AvailabilityFormValues,
} from "@/features/availability/AvailabilityDialog/schema";
import { WindowRow } from "@/features/availability/AvailabilityDialog/WindowRow";
import {
	defaultEditTarget,
	draftsOf,
	formatWeekStart,
	PATTERN_SCOPE,
	toReplaceRequest,
	type AvailabilityScope,
	type EditTarget,
	type WeeklyWindow,
	type WindowDraft,
} from "@/features/availability/availabilityModel";
import { availabilityRefusal } from "@/features/availability/availabilityRefusal";

export type AvailabilityDialogProps = {
	/** Whose availability it is, for the dialog's description. */
	name: string;
	/** The week the editor was opened from, as its Monday. */
	weekStartMonday: string;
	/** What is in force that week: its own hours, or the pattern's. */
	weekWindows: ReadonlyArray<WeeklyWindow>;
	/**
	 * The default pattern. Left out while it can't be offered (still loading,
	 * or unreadable): then only the week can be changed.
	 */
	patternWindows?: ReadonlyArray<WeeklyWindow>;
	/** Said under "Every week" while the pattern is left out, e.g. that it is loading. */
	patternNote?: string;
	/** Whether the week has hours of its own: the editor opens on it and offers its reset. */
	overridden: boolean;
	/**
	 * Takes the complete new set for the week or the pattern. A rejection is
	 * explained on the rows it names or as the dialog's alert.
	 */
	onSubmit: (
		scope: AvailabilityScope,
		windows: Array<WeeklyWindow>
	) => Promise<unknown>;
	/** Returns an overridden week to the pattern, once confirmed. */
	onReset: () => Promise<unknown>;
	onClose: () => void;
};

const key = "availability.dialog";
/** A row with nothing chosen yet. */
const emptyRow = (): WindowDraft => ({ days: [], startTime: "", endTime: "" });

/**
 * The one editor of a part-time person's availability: "This week only"
 * or "Every week" (the default pattern) at the top, then rows of windows,
 * each on any number of days, submitted as a whole set. Choosing the other
 * target shows what is saved for it. A week can also be saved as not
 * available at all, or, when it has hours of its own, reset to the
 * pattern. Mount when opened and unmount when closed so every attempt
 * starts fresh.
 */
export const AvailabilityDialog = ({
	name,
	weekStartMonday,
	weekWindows,
	patternWindows,
	patternNote,
	overridden,
	onSubmit,
	onReset,
	onClose,
}: AvailabilityDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [target, setTarget] = useState<EditTarget>(() =>
		patternWindows ? defaultEditTarget(overridden, weekWindows) : "week"
	);
	const [confirmingReset, setConfirmingReset] = useState(false);
	const [resetting, setResetting] = useState(false);
	const date = formatWeekStart(weekStartMonday, formattingLocale(i18n));
	const windowsFor = (next: EditTarget): ReadonlyArray<WeeklyWindow> =>
		next === "week" ? weekWindows : (patternWindows ?? []);
	const scope: AvailabilityScope =
		target === "week" ? { kind: "week", weekStartMonday } : PATTERN_SCOPE;
	const formId = useId();
	const schema = useMemo(() => availabilityFormSchema(t), [t]);
	const form = useForm<AvailabilityFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { rows: draftsOf(windowsFor(target)) },
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = form;
	const { fields, append, remove } = useFieldArray({ control, name: "rows" });
	const submit = useCreateFormSubmit(
		form,
		fields.map((_, index) => `rows.${index}` as const),
		onClose
	);
	const save = handleSubmit(async ({ rows }) => {
		await submit.run(
			() => onSubmit(scope, toReplaceRequest(rows).windows),
			(error) => availabilityRefusal(error, rows, t)
		);
	});
	const choose = (value: string): void => {
		const next: EditTarget = value === "pattern" ? "pattern" : "week";
		setTarget(next);
		reset({ rows: draftsOf(windowsFor(next)) });
	};
	const resetToPattern = async (): Promise<void> => {
		setResetting(true);
		await submit.run(onReset, (error) => availabilityRefusal(error, [], t));
		setResetting(false);
		setConfirmingReset(false);
	};
	const weekActions = target === "week" && (
		<>
			{overridden && (
				<Button
					disabled={isSubmitting}
					variant="textlink"
					onClick={() => {
						setConfirmingReset(true);
					}}
				>
					{t(`${key}.reset`)}
				</Button>
			)}
			<Button
				disabled={isSubmitting}
				variant="secondary"
				onClick={() => {
					remove();
					void save();
				}}
			>
				{t(`${key}.notAvailable`)}
			</Button>
		</>
	);
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			className="max-w-200"
			extraActions={weekActions}
			formId={formId}
			message={submit.message}
			submitLabel={t(`${key}.submit`)}
			submitting={isSubmitting}
			title={t(`${key}.title`)}
			description={
				target === "week"
					? t(`${key}.weekDescription`, { name, date })
					: t(`${key}.description`, { name })
			}
			onClose={submit.close}
			onSubmit={(event) => save(event)}
		>
			<div
				aria-label={t(`${key}.applies`)}
				className="grid gap-4 sm:grid-cols-2"
				role="radiogroup"
			>
				<RadioCard
					checked={target === "week"}
					description={t(`${key}.thisWeekOnlyDescription`, { date })}
					disabled={isSubmitting}
					label={t(`${key}.thisWeekOnly`)}
					name={`${formId}-target`}
					value="week"
					onChange={choose}
				/>
				<RadioCard
					checked={target === "pattern"}
					disabled={isSubmitting || !patternWindows}
					label={t(`${key}.everyWeek`)}
					name={`${formId}-target`}
					value="pattern"
					description={
						patternWindows ? t(`${key}.everyWeekDescription`) : patternNote
					}
					onChange={choose}
				/>
			</div>
			{fields.length === 0 && (
				<p className="text-sm text-neutral-700">{t(`${key}.noWindows`)}</p>
			)}
			{fields.map((field, index) => (
				<WindowRow
					key={field.id}
					control={control}
					disabled={isSubmitting}
					error={errors.rows?.[index]?.message}
					index={index}
					onRemove={() => {
						remove(index);
					}}
				/>
			))}
			<Button
				disabled={isSubmitting}
				leadingIcon={<PlusIcon />}
				variant="textlink"
				onClick={() => {
					append(emptyRow());
				}}
			>
				{t(`${key}.add`)}
			</Button>
			{confirmingReset && (
				<ConfirmDialog
					cancelLabel={t(`${key}.resetCancel`)}
					confirmLabel={t(`${key}.resetConfirm`)}
					description={t(`${key}.resetDescription`, { name, date })}
					submitting={resetting}
					title={t(`${key}.resetTitle`)}
					onClose={() => {
						setConfirmingReset(false);
					}}
					onConfirm={() => {
						void resetToPattern();
					}}
				/>
			)}
		</CreateFormDialog>
	);
};
