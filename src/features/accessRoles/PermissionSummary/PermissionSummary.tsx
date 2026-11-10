import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { sectionLevels } from "@/features/accessRoles/sectionLevels";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

export type PermissionSummaryProps = {
	/** Says what the list is, e.g. "This role allows". */
	title: string;
	permissions: ReadonlyArray<PermissionKey>;
	className?: string;
};

/**
 * What a set of permissions allows, read at a glance: one line per section
 * of the role editor with how much of it is held (View, Manage or Full) and
 * which of its resources. Sections with nothing allowed are left out.
 */
export const PermissionSummary = ({
	title,
	permissions,
	className,
}: PermissionSummaryProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const sections = sectionLevels(permissions);
	const list = new Intl.ListFormat(i18n.resolvedLanguage ?? i18n.language, {
		type: "conjunction",
	});

	return (
		<div
			className={joinClassNames(
				"rounded-lg border border-neutral-400 bg-neutral-50 p-4",
				className
			)}
		>
			<h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
			{sections.length === 0 ? (
				<p className="mt-2 text-sm text-neutral-700">
					{t("organisation.permissions.none")}
				</p>
			) : (
				<dl className="mt-4 grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
					{sections.map((section) => (
						<div key={section.module} className="flex min-w-0 flex-col gap-2">
							<dt className="font-semibold text-neutral-900">
								{t(`organisation.permissions.sections.${section.module}.name`)}
							</dt>
							<dd className="flex flex-wrap items-center gap-2">
								<Badge>
									{t(`organisation.permissions.levels.${section.level}`)}
								</Badge>
								<span className="text-neutral-700">
									{list.format(
										section.resources.map((resource) =>
											t(`organisation.permissions.${resource}.name`)
										)
									)}
								</span>
							</dd>
						</div>
					))}
				</dl>
			)}
		</div>
	);
};
