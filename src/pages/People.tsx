import { useMutation, useQuery } from "@tanstack/react-query";
import { getRouteApi, useRouterState } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import { saveFile } from "@/common/saveFile";
import type { FunctionComponent } from "@/common/types";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import {
	DeleteIcon,
	DepartmentIcon,
	DownloadIcon,
	HistoryIcon,
	RoleIcon,
	TimeIcon,
	UploadIcon,
} from "@/components/ui/Icon";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { Pagination } from "@/components/ui/Pagination";
import { Toast } from "@/components/ui/Toast";
import { allTermsQuery } from "@/features/employmentTerms/api";
import { BulkChangeEmploymentTermsDialog } from "@/features/employmentTerms/BulkChangeEmploymentTermsDialog";
import { EmploymentTermsFilter } from "@/features/employmentTerms/EmploymentTermsFilter";
import {
	chosenTermsName,
	termsChoices,
} from "@/features/employmentTerms/termsFilter";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	isMemberStatus,
	isPeopleSortField,
	MEMBER_STATUSES,
	PEOPLE_PAGE_SIZE,
} from "@/features/people/api";
import { exportPeople } from "@/features/people/import/api";
import { InvitationFilter } from "@/features/people/InvitationFilter";
import { describePeople, peopleColumns } from "@/features/people/peopleColumns";
import { PeopleNotice } from "@/features/people/PeopleNotice";
import { peopleNoticeFrom } from "@/features/people/peopleNoticeState";
import {
	pageParameter,
	PEOPLE_UNIT_RULES,
	peopleQueryOf,
	sortParameter,
	statusesOf,
	termsFilterApplies,
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

/** A toolbar action beside Add employee: a button from `md`, an item of one menu below it. */
type ToolbarAction = {
	id: string;
	label: string;
	icon: ReactNode;
	onSelect: () => void;
	/** Running: the button shows its spinner and the menu item rests. */
	busy?: boolean;
};

/** The API's reason for refusing an export, when it gave one. */
const exportRefusal = (error: unknown): string | undefined =>
	error instanceof ApiProblemError ? error.errorCode : undefined;

/**
 * The company's people, a page at a time, sorted, filtered and searched by
 * the server: the people of the header's Branch (every Branch in reach under
 * "All branches"), narrowed to a Department, and to the holders of one
 * employment terms for whoever may read people's terms, and to the people
 * who have, or have not, signed in yet (marked Invited), from the Filters.
 * The units, page, sort, status and terms live in the URL; the search text
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
	// Resolved as the header resolves them, so the list asks for the default Branch before the URL names one.
	const units = useUnitSelection(
		companyId,
		PEOPLE_READ_KEYS,
		requested,
		PEOPLE_UNIT_RULES
	);
	const access = useAccess();
	// Who holds which terms is its own key; without it the filter is not offered and `?terms=` is ignored.
	const canFilterByTerms = access.canAnywhere("member_employment_terms:read");
	const allTerms = useQuery(allTermsQuery(companyId, canFilterByTerms));
	const query = peopleQueryOf(
		search,
		settled,
		selectedUnits(units),
		canFilterByTerms
	);
	// Only active people hold terms, so the field rests while only inactive people are shown.
	const termsFieldDisabled =
		canFilterByTerms && !termsFilterApplies(search, canFilterByTerms);
	const list = usePeople(companyId, query);
	// Ticked rows belong to the list they were ticked in; another page or filter starts empty.
	const listKey = JSON.stringify(query);
	const [ticked, setTicked] = useState<{ listKey: string; ids: Array<string> }>(
		{ listKey, ids: [] }
	);
	const selectedIds = ticked.listKey === listKey ? ticked.ids : [];
	const columns = useMemo(() => peopleColumns(t, access.can), [t, access.can]);
	const canAdd = access.canAnywhere("member_profile:create");
	// The API checks each person's Department and skips anyone out of reach.
	const canChangeTerms = access.canAnywhere("member_employment_terms:update");
	const [changingTerms, setChangingTerms] = useState(false);
	const [termsToast, setTermsToast] = useState<{ id: number; text: string }>();
	const exporting = useMutation({
		mutationFn: () => exportPeople(companyId, query),
		onSuccess: ({ blob, fileName }) => {
			saveFile(blob, fileName);
		},
	});
	const notice = peopleNoticeFrom(
		useRouterState({ select: (state) => state.location.state })
	);
	// Anything that changes which people are listed starts again from the first page.
	const show = (next: PeopleSearch): void => {
		void navigate({
			search: (previous) => ({ ...previous, page: undefined, ...next }),
		});
	};
	const secondaryActions: Array<ToolbarAction> = [
		...(canAdd
			? [
					{
						id: "import",
						label: t("people.import"),
						icon: <UploadIcon />,
						onSelect: (): void => {
							void navigate({ to: "/settings/data/import-people" });
						},
					},
					{
						id: "imports",
						label: t("people.imports"),
						icon: <HistoryIcon />,
						onSelect: (): void => {
							void navigate({ to: "/settings", search: { section: "data" } });
						},
					},
				]
			: []),
		{
			id: "export",
			label: exporting.isPending ? t("people.exporting") : t("people.export"),
			icon: <DownloadIcon />,
			busy: exporting.isPending,
			onSelect: (): void => {
				exporting.mutate();
			},
		},
	];
	// The Branch is the header's scope, not a filter: only Department, terms and status are listed and cleared here.
	const chips = [
		...departmentChips(
			units,
			() => {
				show({ department: undefined });
			},
			t
		),
		...(query.employmentTermsId
			? [
					filterChip(
						"terms",
						t("employmentTerms.filter.label"),
						chosenTermsName(allTerms.data?.terms, query.employmentTermsId) ??
							t("employmentTerms.filter.unknown"),
						() => {
							show({ terms: undefined });
						},
						t
					),
				]
			: []),
		...(search.invitation
			? [
					filterChip(
						"invitation",
						t("people.invitationFilter.label"),
						t(`people.invitationFilter.${search.invitation}`),
						() => {
							show({ invitation: undefined });
						},
						t
					),
				]
			: []),
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
		show({
			status: undefined,
			department: undefined,
			terms: undefined,
			invitation: undefined,
		});
	};
	// The Branch is scope, so an empty Branch still reads "No people yet"; a search or a set filter reads "No matches".
	const view = describePeople(list, query.search !== "" || chips.length > 0, t);

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
						{/* From `md` each action is a button; below it they wait in one menu beside Add employee. */}
						<div className="hidden md:contents">
							{secondaryActions.map((action) => (
								<Button
									key={action.id}
									leadingIcon={action.icon}
									loading={action.busy}
									variant="secondary"
									onClick={action.onSelect}
								>
									{action.label}
								</Button>
							))}
						</div>
						<OverflowMenu
							framed
							className="md:hidden"
							label={t("people.moreActions")}
							variant="icon"
						>
							{secondaryActions.map((action) => (
								<OverflowMenuItem
									key={action.id}
									disabled={action.busy}
									onClick={action.onSelect}
								>
									{action.label}
								</OverflowMenuItem>
							))}
						</OverflowMenu>
					</>
				}
				filterFields={
					<>
						<DepartmentFilter
							selection={units}
							onChange={(department) => {
								show({ department });
							}}
						/>
						{canFilterByTerms && (
							<EmploymentTermsFilter
								value={query.employmentTermsId}
								choices={termsChoices(
									allTerms.data?.terms ?? [],
									query.employmentTermsId
								)}
								disabledReason={
									termsFieldDisabled
										? t("employmentTerms.filter.inactiveShown")
										: undefined
								}
								onChange={(terms) => {
									show({ terms });
								}}
							/>
						)}
						<InvitationFilter
							value={search.invitation}
							onChange={(invitation) => {
								show({ invitation });
							}}
						/>
					</>
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
			{exporting.isError && (
				<p className="mt-4 text-sm text-error-700" role="alert">
					{exportRefusal(exporting.error) === "EXPORT_TOO_LARGE"
						? t("people.exportTooLarge")
						: t("people.exportFailed")}
				</p>
			)}
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
							{canChangeTerms && (
								<Button
									leadingIcon={<TimeIcon />}
									size="sm"
									variant="secondary"
									onClick={() => {
										setChangingTerms(true);
									}}
								>
									{t("employmentTerms.bulk.action")}
								</Button>
							)}
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
			{changingTerms && (
				<BulkChangeEmploymentTermsDialog
					companyId={companyId}
					membershipIds={selectedIds}
					onClose={() => {
						setChangingTerms(false);
					}}
					onDone={(text) => {
						setTermsToast({ id: Date.now(), text });
						setTicked({ listKey, ids: [] });
					}}
				/>
			)}
			{termsToast && (
				<Toast
					key={termsToast.id}
					onDismiss={() => {
						setTermsToast(undefined);
					}}
				>
					{termsToast.text}
				</Toast>
			)}
		</>
	);
};
