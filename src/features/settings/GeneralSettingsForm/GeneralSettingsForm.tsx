import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState, type ComponentPropsWithRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { CrossIcon, SaveIcon } from "@/components/ui/Icon";
import {
	COUNTRY_OPTIONS,
	DATE_FORMAT_OPTIONS,
	LANGUAGE_OPTIONS,
	TIME_ZONE_OPTIONS,
} from "@/features/settings/options";
import {
	generalSettingsSchema,
	type GeneralSettingsValues,
} from "@/features/settings/schemas";
import { workspaceNameRefusal } from "@/features/settings/workspaceNameRefusal";

export type GeneralSettingsFormProps = Omit<
	ComponentPropsWithRef<"form">,
	"children" | "defaultValue" | "onSubmit" | "onReset"
> & {
	/** The workspace's current settings; Cancel returns the form to them. */
	defaultValues: GeneralSettingsValues;
	/** Whether the person may rename the workspace (`company:update` at the company). */
	canRename: boolean;
	/** Saves the trimmed workspace name; resolves to the name as saved. */
	onSave: (workspaceName: string) => Promise<string>;
};

const SELECT_FIELDS = [
	{
		name: "defaultLanguage",
		labelKey: "settings.general.defaultLanguage",
		options: LANGUAGE_OPTIONS,
	},
	{
		name: "timeZone",
		labelKey: "settings.general.timeZone",
		options: TIME_ZONE_OPTIONS,
	},
	{
		name: "dateFormat",
		labelKey: "settings.general.dateFormat",
		options: DATE_FORMAT_OPTIONS,
	},
	{
		name: "country",
		labelKey: "settings.general.country",
		options: COUNTRY_OPTIONS,
	},
] as const;

/**
 * The General settings. Only the workspace name can be saved so far: Save
 * Changes renames the company once the name changed, and the preferences
 * stay fixed (and say so). Without permission to rename, the name is shown
 * read-only with the reason instead of Save and Cancel.
 */
export const GeneralSettingsForm = ({
	defaultValues,
	canRename,
	onSave,
	className,
	...rest
}: GeneralSettingsFormProps): FunctionComponent => {
	const { t } = useTranslation();
	const schema = useMemo(() => generalSettingsSchema(t), [t]);
	const {
		register,
		control,
		reset,
		handleSubmit,
		setError,
		formState: { errors, dirtyFields, isSubmitting },
	} = useForm<GeneralSettingsValues>({
		resolver: zodResolver(schema),
		defaultValues,
		mode: "onTouched",
	});
	const [alert, setAlert] = useState<string | undefined>();
	const idPrefix = useId();
	const fieldId = (name: keyof GeneralSettingsValues): string =>
		`${idPrefix}-${name}`;
	const workspaceNameError = errors.workspaceName?.message;

	const save = async (values: GeneralSettingsValues): Promise<void> => {
		setAlert(undefined);
		try {
			const saved = await onSave(values.workspaceName);
			reset({ ...values, workspaceName: saved });
		} catch (error) {
			const refusal = workspaceNameRefusal(error, t);
			if (refusal.workspaceName)
				setError("workspaceName", {
					type: "server",
					message: refusal.workspaceName,
				});
			setAlert(refusal.message);
		}
	};

	return (
		<form
			noValidate
			className={joinClassNames("flex flex-col", className)}
			onSubmit={(event) => {
				void handleSubmit(save)(event);
			}}
			{...rest}
		>
			<div className="flex flex-col gap-7">
				<FormRow
					error={workspaceNameError}
					htmlFor={fieldId("workspaceName")}
					label={t("settings.general.workspaceName")}
				>
					<Input
						autoComplete="organization"
						className="w-full"
						disabled={!canRename || isSubmitting}
						id={fieldId("workspaceName")}
						status={workspaceNameError ? "error" : undefined}
						aria-describedby={
							workspaceNameError
								? formRowIds(fieldId("workspaceName")).errorId
								: undefined
						}
						{...register("workspaceName")}
					/>
				</FormRow>
				{SELECT_FIELDS.map(({ name, labelKey, options }) => (
					<FormRow key={name} htmlFor={fieldId(name)} label={t(labelKey)}>
						<Controller
							control={control}
							name={name}
							render={({ field }) => (
								<Select
									ref={field.ref}
									disabled
									aria-labelledby={formRowIds(fieldId(name)).labelId}
									className="w-full"
									name={field.name}
									value={field.value}
									options={options.map((option) => ({
										value: option.value,
										label: t(option.labelKey),
									}))}
									onChange={field.onChange}
								/>
							)}
						/>
					</FormRow>
				))}
			</div>
			<div className="mt-auto flex flex-col items-end gap-3 pt-8">
				<p className="text-sm text-neutral-700">
					{t("settings.general.preferencesUnavailable")}
				</p>
				{alert && (
					<p className="text-sm text-error-700" role="alert">
						{alert}
					</p>
				)}
				{canRename ? (
					<div className="flex flex-wrap justify-end gap-4">
						<Button
							disabled={isSubmitting}
							leadingIcon={<CrossIcon />}
							variant="cancel"
							onClick={() => {
								setAlert(undefined);
								reset();
							}}
						>
							{t("settings.general.cancel")}
						</Button>
						<Button
							disabled={!dirtyFields.workspaceName || isSubmitting}
							leadingIcon={<SaveIcon />}
							type="submit"
						>
							{t(
								isSubmitting
									? "settings.general.saving"
									: "settings.general.save"
							)}
						</Button>
					</div>
				) : (
					<p className="text-sm text-neutral-700">
						{t("settings.general.renameUnavailable")}
					</p>
				)}
			</div>
		</form>
	);
};
