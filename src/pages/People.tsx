import { getRouteApi, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import {
	DeleteIcon,
	DepartmentIcon,
	DownloadIcon,
	RoleIcon,
	UploadIcon,
} from "@/components/ui/Icon";
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
	PEOPLE_UNIT_RULES,
	peopleQueryOf,
	sortParameter,
	statusesOf,
	statusParameter,
	type PeopleSearch,
} from "@/features/people/peopleSearch";
import { usePeople, useSettledSearch } from "@/features/people/usePeople";
import { PEOPLE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips, filterChip } from "@/features/workspace/filterChips";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { selectedUnits } from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const route = getRouteApi("/_authenticated/_app/people");

/**
 * The company's people, a page at a time, sorted, filtered and searched by
 * the server: everyone in reach unless a Branch, and then a Department, is
 * chosen. The units, page, sort and status live in the URL; the search text
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
	const requested = unitSelectionOf(search);
	// The same units the selector shows, so the list asks for them before the URL names them.
	const units = useUnitSelection(
		companyId,
		PEOPLE_READ_KEYS,
		requested,
		PEOPLE_UNIT_RULES
	);
	const query = peopleQueryOf(search, settled, selectedUnits(units));
	const list = usePeople(companyId, query);
	// Ticked rows belong to the list they were ticked in; another page or filter starts empty.
	const listKey = JSON.stringify(query);
	const [ticked, setTicked] = useState<{ listKey: string; ids: Array<string> }>(
		{ listKey, ids: [] }
	);
	const selectedIds = ticked.listKey === listKey ? ticked.ids : [];
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
	// The Branch is the header's scope, not a filter: only Department and status are listed and cleared here.
	const chips = [
		...departmentChips(
			units,
			() => {
				show({ department: undefined });
			},
			t
		),
		...(search.status
			? [
					filterChip(
						"status",
						t("organisation.list.showing"),
						t(`organisation.status.${search.status}`),
						() => {
							show({ status: undefined });
						},
						t
					),
				]
			: []),
	];
	const clearFilters = (): void => {
		show({ status: undefined, department: undefined });
	};

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("people.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">{t("people.subtitle")}</p>
			{notice && <PeopleNotice className="mt-6" notice={notice} />}
			<ListToolbar
				chips={chips}
				className="mt-10"
				createLabel={t("people.add")}
				search={text}
				searchLabel={t("people.search")}
				actions={
					<>
						<Button
							disabled
							leadingIcon={<UploadIcon />}
							title={t("people.bulk.unavailable")}
							variant="secondary"
						>
							{t("people.import")}
						</Button>
						<Button
							disabled
							leadingIcon={<DownloadIcon />}
							title={t("people.bulk.unavailable")}
							variant="secondary"
						>
							{t("people.export")}
						</Button>
					</>
				}
				filterFields={
					<DepartmentFilter
						selection={units}
						onChange={(department) => {
							show({ department });
						}}
					/>
				}
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
				onClearFilters={clearFilters}
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
					{selectedIds.length > 0 && (
						<BulkActionBar
							className="mt-8"
							summary={t("people.bulk.selected", { count: selectedIds.length })}
							onClear={() => {
								setTicked({ listKey, ids: [] });
							}}
						>
							{(
								[
									["editDepartment", DepartmentIcon],
									["editRole", RoleIcon],
									["exportSelected", DownloadIcon],
								] as const
							).map(([action, Icon]) => (
								<Button
									key={action}
									disabled
									leadingIcon={<Icon />}
									size="sm"
									title={t("people.bulk.unavailable")}
									variant="secondary"
								>
									{t(`people.bulk.${action}`)}
								</Button>
							))}
							<Button
								disabled
								className="border-error-200! bg-error-50! text-error-600! disabled:opacity-60"
								leadingIcon={<DeleteIcon />}
								size="sm"
								title={t("people.bulk.unavailable")}
								variant="secondary"
							>
								{t("people.bulk.setInactive")}
							</Button>
						</BulkActionBar>
					)}
					<DataTable
						manualSorting
						className={selectedIds.length > 0 ? "mt-5" : "mt-8"}
						columns={columns}
						data={view.rows}
						emptyState={view.empty}
						getRowId={(person) => person.membershipId}
						label={t("people.label")}
						sort={{ id: query.sort.field, desc: query.sort.desc }}
						sortControl="menu"
						selection={{
							rowLabel: (person) => person.displayName,
							selectedIds,
							onChange: (ids) => {
								setTicked({ listKey, ids });
							},
						}}
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
