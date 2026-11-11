import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import {
	FormRow,
	formRowIds,
	type FormRowProps,
} from "@/components/forms/FormRow";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { CompanyMember } from "@/features/organisation/api";
import { MAX_HEADS } from "@/features/organisation/createSchemas";

/** A people field's own props, whichever list it searches: its label and hint, and who is chosen. */
export type MemberFieldProps = {
	id: string;
	label: string;
	placeholder: string;
	hint: string;
	error?: string;
	disabled?: boolean;
	/** Heads are required; another use of the picker, such as a manager, may not be. */
	required?: boolean;
	/** The most people chosen at once; twenty heads unless a use keeps fewer. */
	max?: number;
	layout?: FormRowProps["layout"];
	/** The inline field column's width; see `FormRow`. */
	fieldWidth?: FormRowProps["fieldWidth"];
	ref?: Ref<HTMLButtonElement>;
} & (
	| {
			multiple?: true;
			value: Array<CompanyMember>;
			onChange: (value: Array<CompanyMember>) => void;
	  }
	| {
			/** One person, such as a manager, instead of up to twenty heads. */
			multiple: false;
			value: CompanyMember | null;
			onChange: (value: CompanyMember | null) => void;
	  }
);

export type MemberPickerFieldProps = MemberFieldProps & {
	query: string;
	onQueryChange: (query: string) => void;
	/** The current page of people to choose from. */
	options: Array<CompanyMember>;
	loading: boolean;
	/** The list could not be loaded; the field says so instead of `noResultsText`. */
	loadFailed: boolean;
	/** Shown when the list is empty and loaded without error. */
	noResultsText: string;
	/** Under the options once the list has loaded. */
	footerText?: string;
};

/**
 * Chooses one to twenty people (or up to `max`) from a list the caller
 * searches, or one person with `multiple={false}`. Knows nothing about
 * where the list comes from: `HeadsField` feeds it the company's active
 * people, an approval step the people who can approve.
 */
export const MemberPickerField = ({
	id,
	label,
	placeholder,
	hint,
	error,
	disabled = false,
	required = true,
	max = MAX_HEADS,
	layout = "stacked",
	fieldWidth,
	ref,
	query,
	onQueryChange,
	options,
	loading,
	loadFailed,
	noResultsText,
	footerText,
	...selection
}: MemberPickerFieldProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "organisation.headsField";
	const ids = formRowIds(id);
	return (
		<FormRow
			error={error}
			fieldWidth={fieldWidth}
			hint={hint}
			htmlFor={id}
			label={label}
			layout={layout}
			required={required}
			counter={
				selection.multiple === false
					? undefined
					: t(`${key}.counter`, { count: selection.value.length, max })
			}
		>
			<Combobox
				ref={ref}
				{...(selection.multiple === false
					? selection
					: { ...selection, maxSelected: max })}
				aria-describedby={error ? ids.errorId : ids.hintId}
				aria-invalid={Boolean(error)}
				aria-label={label}
				aria-required={required || undefined}
				disabled={disabled}
				emptyText={loadFailed ? t(`${key}.membersFailed`) : noResultsText}
				footer={footerText}
				getKey={(member) => member.membershipId}
				getLabel={(member) => member.displayName}
				id={id}
				loading={loading}
				loadingText={t(`${key}.loading`)}
				options={options}
				placeholder={placeholder}
				query={query}
				searchPlaceholder={t(`${key}.searchPlaceholder`)}
				status={error ? "error" : undefined}
				renderOption={(member) => (
					<span className="flex items-center gap-3">
						<Avatar className="size-9 text-sm" name={member.displayName} />
						<span className="min-w-0 flex-1 truncate">
							{member.displayName}
						</span>
						<Badge className="normal-case" tone="success">
							{t(`${key}.active`)}
						</Badge>
					</span>
				)}
				onQueryChange={onQueryChange}
			/>
		</FormRow>
	);
};
