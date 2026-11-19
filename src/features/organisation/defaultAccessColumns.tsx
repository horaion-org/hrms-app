import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import type { DefaultAccessRule } from "@/features/organisation/api";
import type { DefaultRuleText } from "@/features/organisation/defaultAccess";

const key = "organisation.accessRoles.defaults";

export type DefaultAccessColumnsOptions = {
	/** A default in words: its role, whose people it covers and where it reaches. */
	describe: (rule: DefaultAccessRule) => DefaultRuleText;
	/** Set when the reader may remove defaults; the Remove column is left out otherwise. */
	onRemove?: (rule: DefaultAccessRule) => void;
};

/**
 * The Default access list's columns: the role, whose people it covers
 * ("Who gets it"), where it reaches ("Applies to"), and Remove for someone
 * who may change default access. Phones keep the role and Remove; the
 * others join from `md`.
 */
export const defaultAccessColumns = (
	t: TFunction,
	{ describe, onRemove }: DefaultAccessColumnsOptions
): Array<DataTableColumn<DefaultAccessRule>> => [
	{
		id: "role",
		header: t(`${key}.columns.role`),
		cell: (rule) => describe(rule).role,
		cellClassName: "font-semibold",
	},
	{
		id: "setFor",
		header: t(`${key}.columns.setFor`),
		cell: (rule) => describe(rule).setFor,
		hideBelow: "md",
	},
	{
		id: "appliesTo",
		header: t(`${key}.columns.appliesTo`),
		cell: (rule) => describe(rule).appliesTo,
		hideBelow: "md",
	},
	...(onRemove
		? [
				{
					id: "remove",
					header: t("organisation.list.actions"),
					cell: (rule: DefaultAccessRule): ReactNode => (
						<Button
							variant="textlink"
							aria-label={t(`${key}.remove.item`, {
								role: describe(rule).role,
								setFor: describe(rule).setFor,
							})}
							onClick={() => {
								onRemove(rule);
							}}
						>
							{t(`${key}.remove.confirm`)}
						</Button>
					),
					headerClassName: "w-24",
				},
			]
		: []),
];
