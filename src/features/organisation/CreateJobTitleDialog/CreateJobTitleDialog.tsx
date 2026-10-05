import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CreateFormDialog } from "@/features/organisation/CreateFormDialog";
import { refusalFor } from "@/features/organisation/CreateJobTitleDialog/refusalFor";
import {
	createJobTitleSchema,
	type CreateJobTitleValues,
} from "@/features/organisation/CreateJobTitleDialog/schema";
import { UnitNameField } from "@/features/organisation/UnitNameField";
import { useCreateFormSubmit } from "@/features/organisation/useCreateFormSubmit";
import { useCreateJobTitle } from "@/features/organisation/useCreateInOrganisation";

export type CreateJobTitleDialogProps = {
	companyId: string;
	onClose: () => void;
};

const FIELDS = ["name"] as const;

/** Mount when opened and unmount when closed so every attempt starts fresh. */
export const CreateJobTitleDialog = ({
	companyId,
	onClose,
}: CreateJobTitleDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "organisation.jobTitles.createDialog";
	const formId = useId();
	const schema = useMemo(() => createJobTitleSchema(t), [t]);
	const form = useForm<CreateJobTitleValues>({
		resolver: zodResolver(schema),
		defaultValues: { name: "" },
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
	const create = useCreateJobTitle(companyId);
	const submit = useCreateFormSubmit(form, FIELDS, onClose);
	return (
		<CreateFormDialog
			alertRef={submit.alertRef}
			cancelLabel={t(`${key}.cancel`)}
			description={t(`${key}.description`)}
			formId={formId}
			message={submit.message}
			submitDisabled={!name.trim()}
			submitLabel={t(`${key}.submit`)}
			submitting={isSubmitting}
			title={t(`${key}.title`)}
			onClose={submit.close}
			onSubmit={(event) =>
				handleSubmit((values) =>
					submit.run(
						() => create.mutateAsync({ name: values.name }),
						(error) => refusalFor(error, values.name, t)
					)
				)(event)
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
		</CreateFormDialog>
	);
};
