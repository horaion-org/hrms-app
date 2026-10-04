import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import {
	DataTable,
	type DataTableColumn,
	type DataTableSort,
} from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { AccessRole } from "@/features/organisation/api";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	actionsColumn,
	describeList,
	nameColumn,
} from "@/features/organisation/listColumns";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useAccessRoles } from "@/features/organisation/useOrganisationList";

/** Access roles, shown as "System Roles". Roles have no status, so no filter. */
export const SystemRoles = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<DataTableSort>({ id: "name", desc: false });
	const list = useAccessRoles(companyId, {
		sort: { field: sort.id, desc: sort.desc },
	});
	const view = describeList(
		list,
		search,
		false,
		t("organisation.accessRoles.empty"),
		t
	);
	const columns = useMemo(
		(): Array<DataTableColumn<AccessRole>> => [
			nameColumn<AccessRole>(t("organisation.accessRoles.name")),
			{
				id: "permissions",
				header: t("organisation.accessRoles.permissions"),
				cell: (role) =>
					role.protectedRole
						? t("organisation.accessRoles.fullAccess")
						: t("organisation.accessRoles.permissionCount", {
								count: role.permissions.length,
							}),
			},
			actionsColumn<AccessRole>(
				t,
				(role) => (
					<>
						<OverflowMenuItem disabled={role.protectedRole}>
							{t("organisation.list.editItem")}
						</OverflowMenuItem>
						<OverflowMenuItem disabled>
							{t("organisation.list.deleteItem")}
						</OverflowMenuItem>
					</>
				),
				// The Company Owner role cannot be edited.
				(role) => !role.protectedRole
			),
		],
		[t]
	);

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("organisation.accessRoles.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("organisation.accessRoles.subtitle")}
			</p>
			<ListToolbar
				className="mt-10"
				createLabel={t("organisation.accessRoles.create")}
				search={search}
				searchLabel={t("organisation.accessRoles.search")}
				onSearchChange={setSearch}
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
						getRowId={(role) => role.accessRoleId}
						label={t("organisation.accessRoles.label")}
						selection={{ rowLabel: (role) => role.name }}
						sort={sort}
						onSortChange={setSort}
					/>
					{view.truncated && (
						<p className="mt-4 text-sm text-neutral-700">{view.truncated}</p>
					)}
				</>
			)}
		</>
	);
};
