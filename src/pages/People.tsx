import { getRouteApi } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	isMemberStatus,
	isPeopleSortField,
	MEMBER_STATUSES,
	PEOPLE_PAGE_SIZE,
} from "@/features/people/api";
import { describePeople, peopleColumns } from "@/features/people/peopleColumns";
import {
	pageParameter,
	peopleQueryOf,
	sortParameter,
	statusesOf,
	statusParameter,
	type PeopleSearch,
} from "@/features/people/peopleSearch";
import { usePeople, useSettledSearch } from "@/features/people/usePeople";

const route = getRouteApi("/_authenticated/_app/people");

/**
 * The company's people, a page at a time, sorted, filtered and searched by
 * the server. The page, sort and status live in the URL; the search text
 * stays on the page so names never reach browser history.
 */
export const People = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const [text, setText] = useState("");
	const settled = useSettledSearch(text);
	const query = peopleQueryOf(search, settled);
	const list = usePeople(companyId, query);
	const view = describePeople(
		list,
		query.search !== "" || query.status !== undefined,
		t
	);
	const columns = useMemo(() => peopleColumns(t), [t]);
	// Anything that changes which people are listed starts again from the first page.
	const show = (next: PeopleSearch): void => {
		void navigate({
			search: (previous) => ({ ...previous, page: undefined, ...next }),
		});
	};

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("people.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">{t("people.subtitle")}</p>
			<ListToolbar
				className="mt-10"
				search={text}
				searchLabel={t("people.search")}
				multipleFilter={{
					label: t("organisation.list.showing"),
					value: statusesOf(search),
					options: MEMBER_STATUSES.map((status) => ({
						value: status,
						label: t(`organisation.status.${status}`),
					})),
					// Both ticked, like neither, shows everyone.
					placeholder: t("people.all"),
					formatSummary: () => t("people.all"),
					onChange: (values) => {
						show({ status: statusParameter(values.filter(isMemberStatus)) });
					},
				}}
				onSearchChange={(value) => {
					setText(value);
					if (search.page !== undefined) show({});
				}}
			/>
			{view.problem ? (
				<p
					className="mt-8 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={view.problem.alert || undefined}
					role={view.problem.alert ? "alert" : undefined}
				>
					{view.problem.message}
				</p>
			) : (
				<>
					<DataTable
						manualSorting
						className="mt-8"
						columns={columns}
						data={view.rows}
						emptyState={view.empty}
						getRowId={(person) => person.membershipId}
						label={t("people.label")}
						sort={{ id: query.sort.field, desc: query.sort.desc }}
						sortControl="menu"
						onSortChange={({ id, desc }) => {
							if (isPeopleSortField(id))
								show({ sort: sortParameter({ field: id, desc }) });
						}}
					/>
					{view.total > 0 && (
						<Pagination
							page={query.page}
							pageSize={PEOPLE_PAGE_SIZE}
							total={view.total}
							onPageChange={(page) => {
								void navigate({
									search: (previous) => ({
										...previous,
										page: pageParameter(page),
									}),
								});
							}}
						/>
					)}
				</>
			)}
		</>
	);
};
