import { useState, type Ref } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
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
	value: Array<CompanyMember>;
	onChange: (value: Array<CompanyMember>) => void;
	error?: string;
	disabled?: boolean;
	ref?: Ref<HTMLButtonElement>;
};

/**
 * Chooses one to twenty heads by searching the company's active people.
 * Invalidate `["organisation", companyId, "members"]` to reload the options.
 */
export const HeadsField = ({
	companyId,
	id,
	label,
	placeholder,
	hint,
	value,
	onChange,
	error,
	disabled = false,
	ref,
}: HeadsFieldProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "organisation.headsField";
	const ids = formRowIds(id);
	const [query, setQuery] = useState("");
	const members = useCompanyMemberSearch(companyId, query);
	return (
		<FormRow
			required
			counter={t(`${key}.counter`, { count: value.length })}
			error={error}
			hint={hint}
			htmlFor={id}
			label={label}
			layout="stacked"
		>
			<Combobox
				ref={ref}
				aria-required
				aria-describedby={error ? ids.errorId : ids.hintId}
				aria-invalid={Boolean(error)}
				aria-label={label}
				disabled={disabled}
				getKey={(member) => member.membershipId}
				getLabel={(member) => member.displayName}
				id={id}
				loading={members.isFetching}
				loadingText={t(`${key}.loading`)}
				maxSelected={MAX_HEADS}
				options={members.data?.items ?? []}
				placeholder={placeholder}
				query={query}
				searchPlaceholder={t(`${key}.searchPlaceholder`)}
				status={error ? "error" : undefined}
				value={value}
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
				onChange={onChange}
				onQueryChange={setQuery}
			/>
		</FormRow>
	);
};
