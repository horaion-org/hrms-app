import type { TFunction } from "i18next";
import { countryName } from "@/common/countries";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { Branch } from "@/features/organisation/api";
import {
	actionsColumn,
	createdColumn,
	nameColumn,
	statusColumn,
} from "@/features/organisation/listColumns";

export type BranchColumnsOptions = {
	/** The app's language, for country names. */
	language: string;
	/** The locale dates are written in. */
	locale: string;
	/** Whether the reader may edit this Branch and change its status (granted at it, or company-wide). */
	canUpdate: (branch: Branch) => boolean;
	onEdit: (branch: Branch) => void;
	onChangeStatus: (branch: Branch) => void;
};

/**
 * The Branches list's columns: name, code, city, country, status, when
 * created and the row actions. Phones keep the name and the actions; Status
 * joins from `sm`, as on People, and the rest from `md`.
 */
export const branchColumns = (
	t: TFunction,
	{ language, locale, canUpdate, onEdit, onChangeStatus }: BranchColumnsOptions
): Array<DataTableColumn<Branch>> => [
	nameColumn<Branch>(t("organisation.branches.name")),
	{
		id: "code",
		header: t("organisation.branches.code"),
		cell: (branch: Branch): string => branch.code,
		sortValue: (branch: Branch): string => branch.code,
		hideBelow: "md",
	},
	{
		id: "city",
		header: t("organisation.branches.city"),
		cell: (branch: Branch): string => branch.city,
		sortValue: (branch: Branch): string => branch.city,
		hideBelow: "md",
	},
	{
		id: "country",
		header: t("organisation.branches.country"),
		cell: (branch: Branch): string => countryName(branch.country, language),
		hideBelow: "md",
	},
	{ ...statusColumn<Branch>(t), hideBelow: "sm" },
	createdColumn<Branch>(t, locale),
	actionsColumn<Branch>(
		t,
		(branch) => (
			<>
				<OverflowMenuItem disabled>
					{t("organisation.list.viewItem")}
				</OverflowMenuItem>
				<OverflowMenuItem disabled>
					{t("organisation.list.duplicateItem")}
				</OverflowMenuItem>
				<OverflowMenuItem
					disabled={!canUpdate(branch)}
					onClick={() => {
						onChangeStatus(branch);
					}}
				>
					{t(
						branch.status === "ACTIVE"
							? "organisation.list.deactivateItem"
							: "organisation.list.activateItem"
					)}
				</OverflowMenuItem>
			</>
		),
		canUpdate,
		onEdit
	),
];
