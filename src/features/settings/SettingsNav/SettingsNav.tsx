import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { ChevronRightIcon } from "@/components/ui/Icon";
import { SYSTEM_ROLES_PATH } from "@/features/organisation/systemRolesPath";
import type {
	SettingsNavGroup,
	SettingsSection,
} from "@/features/settings/sections";

export type SettingsNavProps = {
	/** The groups to list, already narrowed to what the person is offered. */
	groups: ReadonlyArray<SettingsNavGroup>;
	/** The section whose panel shows; its link is marked current. */
	selected: SettingsSection;
	/** The list is the whole page (a phone with no section chosen): below `md` no entry is shown as current. */
	listIsPage?: boolean;
	className?: string;
};

/* Rows sit flush inside the bordered card, so the focus ring is drawn inside, as on a vertical Tab. */
const linkClasses =
	"flex min-h-10 items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm text-neutral-800 outline-none pointer-coarse:min-h-11 not-aria-[current=page]:hover:bg-neutral-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-blue-500";

/** The current entry's tint, as the side menu's current page. */
const currentClasses =
	"aria-[current=page]:bg-ink-blue-100 aria-[current=page]:font-semibold aria-[current=page]:text-ink-blue-900";

/** The same tint from `md` only, for when the list is the page on a phone. */
const currentFromMdClasses =
	"md:aria-[current=page]:bg-ink-blue-100 md:aria-[current=page]:font-semibold md:aria-[current=page]:text-ink-blue-900";

/** One entry's label, with a chevron on a phone, where the list is a page of its own. */
const EntryLabel = ({ label }: { label: string }): FunctionComponent => (
	<>
		<span className="min-w-0">{label}</span>
		<ChevronRightIcon
			aria-hidden="true"
			className="size-5 shrink-0 text-ink-blue-900 md:hidden"
		/>
	</>
);

/**
 * Settings' navigation: each group's label over its entries, each entry a
 * link to its section (Access roles to its own page), the current one
 * marked with `aria-current`. It shows only what it is given; the page
 * decides what is offered.
 */
export const SettingsNav = ({
	groups,
	selected,
	listIsPage = false,
	className,
}: SettingsNavProps): FunctionComponent => {
	const { t } = useTranslation();
	const entryClasses = joinClassNames(
		linkClasses,
		listIsPage ? currentFromMdClasses : currentClasses
	);
	const idPrefix = useId();
	return (
		<nav
			aria-label={t("settings.sections")}
			className={joinClassNames("flex flex-col gap-6 p-4", className)}
		>
			{groups.map(({ group, sections }) => (
				<div key={group}>
					<p
						className="px-3 text-xs font-semibold text-ink-blue-600 uppercase"
						id={`${idPrefix}-${group}`}
					>
						{t(`settings.groups.${group}`)}
					</p>
					<ul
						aria-labelledby={`${idPrefix}-${group}`}
						className="mt-2 flex flex-col gap-1"
					>
						{sections.map((section) => {
							const label = t(`settings.entries.${section}.title`);
							return (
								<li key={section}>
									{section === "access" ? (
										<Link className={entryClasses} to={SYSTEM_ROLES_PATH}>
											<EntryLabel label={label} />
										</Link>
									) : (
										<Link
											activeProps={{}}
											aria-current={section === selected ? "page" : undefined}
											className={entryClasses}
											search={{ section }}
											to="/settings"
										>
											<EntryLabel label={label} />
										</Link>
									)}
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</nav>
	);
};
