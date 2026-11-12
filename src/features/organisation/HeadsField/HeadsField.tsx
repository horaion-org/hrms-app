import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { MAX_HEADS } from "@/features/organisation/createSchemas";
import {
	MemberPickerField,
	type MemberFieldProps,
} from "@/features/organisation/MemberPickerField";
import { useCompanyMemberSearch } from "@/features/organisation/useCompanyMemberSearch";

export type HeadsFieldProps = { companyId: string } & MemberFieldProps;

/**
 * Chooses one to twenty heads (or up to `max` people) by searching the company's active people, or
 * one person with `multiple={false}`. Invalidate
 * `["organisation", companyId, "members"]` to reload the options.
 */
export const HeadsField = ({
	companyId,
	...field
}: HeadsFieldProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "organisation.headsField";
	const [query, setQuery] = useState("");
	const members = useCompanyMemberSearch(companyId, query);
	return (
		<MemberPickerField
			{...field}
			loadFailed={members.isError}
			loading={members.isFetching}
			noResultsText={t(`${key}.noResults`)}
			options={members.data?.items ?? []}
			query={query}
			footerText={
				members.data &&
				t(
					members.data.total > MAX_HEADS
						? `${key}.membersTruncated`
						: `${key}.membersFooter`,
					{ total: members.data.total }
				)
			}
			onQueryChange={setQuery}
		/>
	);
};
