import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useRouterState } from "@tanstack/react-router";
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
import { PeopleNotice } from "@/features/people/PeopleNotice";
import { peopleNoticeFrom } from "@/features/people/peopleNoticeState";
import {
	pageParameter,
	peopleQueryOf,
	sortParameter,
	statusesOf,
	statusParameter,
	type PeopleSearch,
} from "@/features/people/peopleSearch";
import { usePeople, useSettledSearch } from "@/features/people/usePeople";
import { workspaceQuery } from "@/features/workspace/api";
import { BranchSelector } from "@/features/workspace/BranchSelector";
import {
	branchChoices,
	chosenBranch,
} from "@/features/workspace/unitChoices";
import { PEOPLE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { useAccess } from "@/features/workspace/useAccess";

const route = getRouteApi("/_authenticated/_app/people");

/**
 * The company's people, a page at a time, sorted, filtered and searched by
 * the server: everyone in reach unless one Branch is chosen. The Branch,
 * page, sort and status live in the URL; the search text
 * stays on the page so names never reach browser history. Someone just
 * added on the Add employee page is confirmed above the list.
 */
export const People = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const [text, setText] = useState("");
	const settled = useSettledSearch(text);
	const workspace = useQuery({ ...workspaceQuery, retry });
	// The same Branch the selector shows, none for every Branch in reach.
	const selected = chosenBranch(
		workspace.data
			? branchChoices(workspace.data, companyId, PEOPLE_READ_KEYS)
			: [],
		search.branch,
		true
	);
	const query = peopleQueryOf(search, settled, selected?.branchId);
	const list = usePeople(companyId, query);
	const view = describePeople(
		list,
		query.search !== "" || query.status !== undefined,
		t
	);
	const access = useAccess();
	const columns = useMemo(() => peopleColumns(t, access.can), [t, access.can]);
	const canAdd = access.canAnywhere("member_profile:create");
	const notice = peopleNoticeFrom(
		useRouterState({ select: (state) => state.location.state })
	);
	// Anything that changes which people are listed starts again from the first page.
	const show = (next: PeopleSearch): void => {
		void navigate({
			search: (previous) => ({ ...previous, page: undefined, ...next }),
		});
	};
	const chooseBranch = (branch: string | undefined): void => {
		// The selector naming the Branch already shown keeps the page, the history entry and its state.
		if (branch === selected?.branchId)
			void navigate({
				search: (previous) => ({ ...previous, branch }),
				replace: true,
				state: true,
			});
		else show({ branch });
	};

	return (
		<>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="text-4xl font-medium text-neutral-900">
						{t("people.title")}
					</h1>
					<p className="mt-4 text-sm text-neutral-800">
						{t("people.subtitle")}
					</p>
				</div>
				<BranchSelector
					allowAll
					className="pt-1"
					companyId={companyId}
					keys={PEOPLE_READ_KEYS}
					value={search.branch}
					onChange={chooseBranch}
				/>
			</div>
			{notice && <PeopleNotice className="mt-6" notice={notice} />}
			<ListToolbar
				className="mt-10"
				createLabel={t("people.add")}
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
				onCreate={
					canAdd
						? (): void => {
								void navigate({ to: "/people/new" });
							}
						: undefined
				}
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
