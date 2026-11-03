import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PlusIcon } from "@/components/ui/Icon";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import {
	availabilityFormSchema,
	type AvailabilityFormValues,
} from "@/features/people/availability/AvailabilityDialog/schema";
import { WindowRow } from "@/features/people/availability/AvailabilityDialog/WindowRow";
import {
	draftsOf,
	formatWeekStart,
	toReplaceRequest,
	type AvailabilityScope,
	type WeeklyWindow,
	type WindowDraft,
} from "@/features/people/availability/availabilityModel";
import { availabilityRefusal } from "@/features/people/availability/availabilityRefusal";

export type AvailabilityDialogProps = {
	/** Whose availability it is, for the dialog's description. */
	name: string;
	/** What is edited: the default pattern, or one week of it. */
	scope: AvailabilityScope;
	/** The windows the editor opens with: the pattern, or what applies to the week. */
	windows: ReadonlyArray<WeeklyWindow>;
	/**
	 * Takes the complete new set. A rejection is explained on the rows it
	 * names or as the dialog's alert.
	 */
	onSubmit: (windows: Array<WeeklyWindow>) => Promise<unknown>;
	/** Given for a week with an override: returns it to the pattern, once confirmed. */
	onReset?: () => Promise<unknown>;
	onClose: () => void;
};

const key = "people.availability.dialog";
/** A row with nothing chosen yet. */
const emptyRow = (): WindowDraft => ({ days: [], startTime: "", endTime: "" });

/**
 * Edits a part-time person's default weekly pattern, or one week of it, as
 * rows of windows, each on any number of days, and submits the whole set at
 * once. A week can also be saved as not available at all, or, when it has
 * an override, reset to the pattern. Mount when opened and unmount when
 * closed so every attempt starts fresh.
 */
export const AvailabilityDialog = ({
	name,
	scope,
	windows,
	onSubmit,
	onReset,
	onClose,
}: AvailabilityDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [confirmingReset, setConfirmingReset] = useState(false);
	const [resetting, setResetting] = useState(false);
	const date =
		scope.kind === "week"
			? formatWeekStart(
					scope.weekStartMonday,
					i18n.resolvedLanguage ?? i18n.language
				)
			: undefined;
	const formId = useId();
	const schema = useMemo(() => availabilityFormSchema(t), [t]);
	const form = useForm<AvailabilityFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { rows: draftsOf(windows) },
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		control,
		handleSubmit,
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
			() => onSubmit(toReplaceRequest(rows).windows),
			(error) => availabilityRefusal(error, rows, t)
		);
	});
	const resetToPattern = async (): Promise<void> => {
		if (!onReset) return;
		setResetting(true);
		await submit.run(onReset, (error) => availabilityRefusal(error, [], t));
		setResetting(false);
		setConfirmingReset(false);
	};
	const weekActions = scope.kind === "week" && (
		<>
			{onReset && (
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
			title={date ? t(`${key}.weekTitle`, { date }) : t(`${key}.title`)}
			description={
				date
					? t(`${key}.weekDescription`, { name, date })
					: t(`${key}.description`, { name })
			}
			onClose={submit.close}
			onSubmit={(event) => save(event)}
		>
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
			{confirmingReset && date && (
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
