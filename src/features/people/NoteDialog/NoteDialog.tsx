import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Textarea } from "@/components/forms/Textarea";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { NOTE_MAX_LENGTH, type MemberNote } from "@/features/people/api";
import {
	noteFormSchema,
	noteRefusal,
	type NoteFormValues,
} from "@/features/people/notes";
import { useSaveNote } from "@/features/people/useNotes";

export type NoteDialogProps = {
	companyId: string;
	membershipId: string;
	/** Who the note is about, for the dialog's description. */
	name: string;
	/** Set to rewrite this note; left out to add one. */
	editing?: MemberNote;
	onClose: () => void;
};

const FIELDS = ["body"] as const;

/**
 * Adds a note about a person, or rewrites one. Mount when opened and
 * unmount when closed so every attempt starts fresh.
 */
export const NoteDialog = ({
	companyId,
	membershipId,
	name,
	editing,
	onClose,
}: NoteDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "people.notes.dialog";
	const formId = useId();
	const id = `${formId}-body`;
	const ids = formRowIds(id);
	const schema = useMemo(() => noteFormSchema(t), [t]);
	const form = useForm<NoteFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { body: editing?.body ?? "" },
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = form;
	const body = useWatch({ control, name: "body" });
	const save = useSaveNote(companyId, membershipId);
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	const error = errors.body?.message;
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			formId={formId}
			message={submit.message}
			submitDisabled={!body.trim()}
			submitLabel={t(editing ? `${key}.editSubmit` : `${key}.addSubmit`)}
			submitting={isSubmitting}
			title={t(editing ? `${key}.editTitle` : `${key}.addTitle`)}
			description={t(
				editing ? `${key}.editDescription` : `${key}.addDescription`,
				{
					name,
				}
			)}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit(async (values) => {
					await submit.run(
						() =>
							save.mutateAsync({ noteId: editing?.noteId, body: values.body }),
						(refused) => noteRefusal(refused, t, editing !== undefined)
					);
				})(event)
			}
		>
			<FormRow
				required
				counter={t(`${key}.bodyCounter`, { count: body.length })}
				error={error}
				hint={t(`${key}.bodyHint`)}
				htmlFor={id}
				label={t(`${key}.body`)}
				layout="stacked"
			>
				<Textarea
					data-autofocus
					required
					aria-describedby={error ? ids.errorId : ids.hintId}
					aria-invalid={Boolean(error)}
					disabled={isSubmitting}
					id={id}
					maxLength={NOTE_MAX_LENGTH}
					placeholder={t(`${key}.bodyPlaceholder`)}
					status={error ? "error" : undefined}
					{...register("body")}
				/>
			</FormRow>
		</CreateFormDialog>
	);
};
