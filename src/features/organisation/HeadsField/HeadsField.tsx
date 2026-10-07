import { useState, type Ref } from "react";
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
import { useCompanyMemberSearch } from "@/features/organisation/useCompanyMemberSearch";

export type HeadsFieldProps = {
	companyId: string;
	id: string;
	label: string;
	placeholder: string;
	hint: string;
	error?: string;
	disabled?: boolean;
	/** Heads are required; another use of the picker, such as a manager, may not be. */
	required?: boolean;
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

/**
 * Chooses one to twenty heads by searching the company's active people, or
 * one person with `multiple={false}`. Invalidate
 * `["organisation", companyId, "members"]` to reload the options.
 */
export const HeadsField = ({
	companyId,
	id,
	label,
	placeholder,
	hint,
	error,
	disabled = false,
	required = true,
	layout = "stacked",
	fieldWidth,
	ref,
	...selection
}: HeadsFieldProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "organisation.headsField";
	const ids = formRowIds(id);
	const [query, setQuery] = useState("");
	const members = useCompanyMemberSearch(companyId, query);
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
					: t(`${key}.counter`, { count: selection.value.length })
			}
		>
			<Combobox
				ref={ref}
				{...(selection.multiple === false
					? selection
					: { ...selection, maxSelected: MAX_HEADS })}
				aria-describedby={error ? ids.errorId : ids.hintId}
				aria-invalid={Boolean(error)}
				aria-label={label}
				aria-required={required || undefined}
				disabled={disabled}
				getKey={(member) => member.membershipId}
				getLabel={(member) => member.displayName}
				id={id}
				loading={members.isFetching}
				loadingText={t(`${key}.loading`)}
				options={members.data?.items ?? []}
				placeholder={placeholder}
				query={query}
				searchPlaceholder={t(`${key}.searchPlaceholder`)}
				status={error ? "error" : undefined}
				emptyText={t(
					members.isError ? `${key}.membersFailed` : `${key}.noResults`
				)}
				footer={
					members.data &&
					t(
						members.data.total > MAX_HEADS
							? `${key}.membersTruncated`
							: `${key}.membersFooter`,
						{ total: members.data.total }
					)
				}
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
				onQueryChange={setQuery}
			/>
		</FormRow>
	);
};
