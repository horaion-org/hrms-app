import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	labelKeyOf,
	PERMISSION_GROUPS,
} from "@/features/organisation/PermissionChecklist/groups";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

export type PermissionSummaryProps = {
	/** Says what the list is, e.g. "This role allows". */
	title: string;
	permissions: ReadonlyArray<PermissionKey>;
	className?: string;
};

/**
 * What a set of permissions allows, read at a glance: one line per resource
 * naming its actions. Resources with nothing allowed are left out.
 */
export const PermissionSummary = ({
	title,
	permissions,
	className,
}: PermissionSummaryProps): FunctionComponent => {
	const { t } = useTranslation();
	const groups = PERMISSION_GROUPS.map((group) => ({
		resource: group.resource,
		keys: group.keys.filter((key) => permissions.includes(key)),
	})).filter((group) => group.keys.length > 0);

	return (
		<div
			className={joinClassNames(
				"rounded-lg border border-neutral-400 bg-neutral-50 p-4",
				className
			)}
		>
			<p className="text-sm font-bold text-neutral-800">{title}</p>
			{groups.length === 0 ? (
				<p className="mt-2 text-sm text-neutral-700">
					{t("organisation.permissions.none")}
				</p>
			) : (
				<dl className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
					{groups.map((group) => (
						<div key={group.resource} className="flex gap-2">
							<dt className="shrink-0 font-semibold text-neutral-900">
								{t(`organisation.permissions.${group.resource}.name`)}
							</dt>
							<dd className="min-w-0 text-neutral-700">
								{group.keys.map((key) => t(labelKeyOf(key))).join(", ")}
							</dd>
						</div>
					))}
				</dl>
			)}
		</div>
	);
};
