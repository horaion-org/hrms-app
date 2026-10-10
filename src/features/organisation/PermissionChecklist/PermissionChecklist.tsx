import { Fragment, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Checkbox } from "@/components/ui/Checkbox";
import {
	labelKeyOf,
	PERMISSION_GROUPS,
	type PermissionGroup,
	toggleGroup,
	togglePermission,
} from "@/features/organisation/PermissionChecklist/groups";
import {
	impliedBy,
	PERMISSION_KEYS,
	PERMISSION_MODULES,
	type PermissionKey,
	resourceOf,
	withImplied,
} from "@/features/workspace/permissionKeys";

const NONE: ReadonlyArray<PermissionKey> = [];

export type PermissionChecklistProps = {
	/** Names the whole list for assistive technology. */
	label: string;
	/** The ticked permissions. */
	value: ReadonlyArray<PermissionKey>;
	/** Receives the new selection, in the catalog's order. */
	onChange: (value: Array<PermissionKey>) => void;
	/** Shows the selection without letting it be changed. */
	disabled?: boolean;
	/** Permissions that can't be ticked, e.g. ones the person may not grant. */
	unavailable?: ReadonlyArray<PermissionKey>;
	className?: string;
};

/**
 * Every permission in the catalog, one row per resource under a heading per
 * Module. A row's first box ticks or clears the whole resource and shows a
 * mixed state in between. Ticking a permission also ticks what it implies,
 * and a permission another one needs says which.
 */
export const PermissionChecklist = ({
	label,
	value,
	onChange,
	disabled = false,
	unavailable = NONE,
	className,
}: PermissionChecklistProps): FunctionComponent => {
	const { t } = useTranslation();
	const canTick = (key: PermissionKey): boolean => !unavailable.includes(key);
	// Whatever a tick implies, an unavailable permission is never added.
	const change = (next: Array<PermissionKey>): void => {
		const implied = withImplied(next.filter((key) => !value.includes(key)));
		onChange(
			PERMISSION_KEYS.filter(
				(key) => next.includes(key) || implied.includes(key)
			).filter((key) => value.includes(key) || canTick(key))
		);
	};
	const nameOf = (key: PermissionKey): string =>
		t("organisation.permissions.cell", {
			resource: t(`organisation.permissions.${resourceOf(key)}.name`),
			action: t(labelKeyOf(key)),
		});
	// Held: why it was added. Cleared: what still needs it.
	const noteOf = (key: PermissionKey): string | undefined => {
		const by = impliedBy(key, value);
		if (by.length === 0) return undefined;
		const names = by.map(nameOf).join(", ");
		return value.includes(key)
			? t("organisation.permissions.addedFor", { by: names })
			: t("organisation.permissions.stillNeededBy", { by: names });
	};

	const renderPermission = (key: PermissionKey): ReactElement => {
		const note = noteOf(key);
		const noteClassName = joinClassNames(
			"pl-6 text-sm",
			value.includes(key) ? "text-neutral-700" : "text-warning-700"
		);
		return (
			<div key={key}>
				<Checkbox
					checked={value.includes(key)}
					disabled={disabled || !canTick(key)}
					label={t(labelKeyOf(key))}
					onChange={(event) => {
						change(togglePermission(value, key, event.target.checked));
					}}
				/>
				{note && <p className={noteClassName}>{note}</p>}
			</div>
		);
	};

	const renderGroup = (group: PermissionGroup): ReactElement => {
		const name = t(`organisation.permissions.${group.resource}.name`);
		const total = group.keys.length;
		const count = group.keys.filter((key) => value.includes(key)).length;
		const tickable = group.keys.filter(canTick);
		const full =
			tickable.length > 0 && tickable.every((key) => value.includes(key));

		return (
			<div
				key={group.resource}
				aria-label={name}
				className="flex flex-col gap-3 border-t border-neutral-400 p-4 hover:bg-neutral-50 md:flex-row md:items-start md:gap-6"
				role="group"
			>
				<div className="md:w-80 md:shrink-0">
					<Checkbox
						checked={full}
						disabled={disabled || tickable.length === 0}
						indeterminate={count > 0 && !full}
						label={name}
						labelClassName="font-semibold"
						onChange={(event) => {
							change(toggleGroup(value, group, event.target.checked));
						}}
					/>
					<p className="mt-1 pl-6 text-sm text-neutral-700">
						{t(`organisation.permissions.${group.resource}.description`)}
					</p>
				</div>
				<div className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-2 pl-6 md:pl-0">
					{group.keys.map(renderPermission)}
				</div>
				<p className="pl-6 text-sm text-neutral-700 md:w-14 md:shrink-0 md:pl-0 md:text-right md:leading-6">
					{t("organisation.permissions.groupCount", { count, total })}
				</p>
			</div>
		);
	};

	return (
		<div
			aria-label={label}
			role="group"
			className={joinClassNames(
				"overflow-hidden rounded-lg border border-neutral-400 bg-white",
				className
			)}
		>
			{PERMISSION_MODULES.map(({ module }) => (
				<Fragment key={module}>
					<h3 className="border-t border-neutral-400 bg-neutral-50 px-4 py-2 text-xs font-semibold tracking-wide text-neutral-700 uppercase first:border-t-0">
						{t(`organisation.permissions.modules.${module}`)}
					</h3>
					{PERMISSION_GROUPS.filter((group) => group.module === module).map(
						renderGroup
					)}
				</Fragment>
			))}
		</div>
	);
};
