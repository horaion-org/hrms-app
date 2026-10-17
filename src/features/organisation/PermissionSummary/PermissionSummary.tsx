import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
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
 * What a set of permissions allows, read at a glance: action badges grouped
 * by resource. Resources with nothing allowed are left out.
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
			<h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
			{groups.length === 0 ? (
				<p className="mt-2 text-sm text-neutral-700">
					{t("organisation.permissions.none")}
				</p>
			) : (
				<dl className="mt-4 grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
					{groups.map((group) => (
						<div key={group.resource} className="flex min-w-0 flex-col gap-2">
							<dt className="font-semibold text-neutral-900">
								{t(`organisation.permissions.${group.resource}.name`)}
							</dt>
							<dd className="flex flex-wrap gap-2">
								{group.keys.map((key) => (
									<Badge key={key}>{t(labelKeyOf(key))}</Badge>
								))}
							</dd>
						</div>
					))}
				</dl>
			)}
		</div>
	);
};
