import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, type ComponentPropsWithRef } from "react";
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

export type GeneralSettingsFormProps = Omit<
	ComponentPropsWithRef<"form">,
	"children" | "defaultValue" | "onSubmit" | "onReset"
> & {
	/** The workspace's current settings; Cancel returns the form to them. */
	defaultValues: GeneralSettingsValues;
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
 * The General settings. There is no endpoint to save them yet, so Save
 * Changes stays disabled (and says why); Cancel discards any edits.
 */
export const GeneralSettingsForm = ({
	defaultValues,
	className,
	...rest
}: GeneralSettingsFormProps): FunctionComponent => {
	const { t } = useTranslation();
	const schema = useMemo(() => generalSettingsSchema(t), [t]);
	const {
		register,
		control,
		reset,
		formState: { errors },
	} = useForm<GeneralSettingsValues>({
		resolver: zodResolver(schema),
		defaultValues,
		mode: "onTouched",
	});
	const idPrefix = useId();
	const fieldId = (name: keyof GeneralSettingsValues): string =>
		`${idPrefix}-${name}`;
	const saveNoteId = `${idPrefix}-save-note`;
	const workspaceNameError = errors.workspaceName?.message;

	return (
		<form
			noValidate
			className={joinClassNames("flex flex-col", className)}
			onSubmit={(event) => {
				event.preventDefault();
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
				<p className="text-sm text-neutral-700" id={saveNoteId}>
					{t("settings.general.saveUnavailable")}
				</p>
				<div className="flex flex-wrap justify-end gap-4">
					<Button
						leadingIcon={<CrossIcon />}
						variant="cancel"
						onClick={() => {
							reset();
						}}
					>
						{t("settings.general.cancel")}
					</Button>
					<Button
						disabled
						aria-describedby={saveNoteId}
						leadingIcon={<SaveIcon />}
						type="submit"
					>
						{t("settings.general.save")}
					</Button>
				</div>
			</div>
		</form>
	);
};
