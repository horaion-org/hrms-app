import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { FilterIcon } from "@/components/ui/Icon";

export type FiltersPopoverProps = {
	/** How many filters are set, shown on the button; the chips beneath the list name them. */
	count: number;
	/** The filter fields, each labelled above its control, e.g. Department and Showing. */
	children: ReactNode;
	className?: string;
};

/**
 * A list's filters behind one "Filters" button, so the page shows them only
 * when asked. The button carries how many are set; its name stays
 * "Filters" and the count describes it. Tab moves from the button into the
 * panel; Escape or a click outside closes it; each field applies as soon
 * as it changes. The panel does not grab focus itself, because a field's
 * own floating list (a Select's options) would then count as leaving it.
 */
export const FiltersPopover = ({
	count,
	children,
	className,
}: FiltersPopoverProps): FunctionComponent => {
	const { t } = useTranslation();
	const countId = useId();
	const panelTitleId = useId();
	return (
		<Popover className={className}>
			<PopoverButton
				aria-describedby={count > 0 ? countId : undefined}
				as={Button}
				// On a phone the icon and count stand for the name, so the button fits beside a search.
				className="max-sm:px-3.5"
				leadingIcon={<FilterIcon />}
				variant="secondary"
			>
				<span className="max-sm:sr-only">{t("filtersPopover.label")}</span>
				<CountBadge aria-hidden="true" count={count} tone="active" />
				{count > 0 && (
					<span aria-hidden="true" className="sr-only" id={countId}>
						{t("filtersPopover.applied", { count })}
					</span>
				)}
			</PopoverButton>
			<PopoverPanel
				anchor="bottom start"
				aria-labelledby={panelTitleId}
				className="z-60 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-4 rounded-lg border border-neutral-400 bg-white p-4 shadow-lg [--anchor-gap:8px] [--anchor-padding:16px]"
				role="dialog"
			>
				<h2 className="sr-only" id={panelTitleId}>
					{t("filtersPopover.label")}
				</h2>
				{children}
			</PopoverPanel>
		</Popover>
	);
};
