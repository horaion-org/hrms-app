import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent, Heroicon } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CloseIcon, InfoIcon } from "@/components/ui/Icon";
import { FindingList } from "@/features/scheduling/FindingList";
import {
	findingFamily,
	strongestTone,
	type Finding,
	type FindingTone,
} from "@/features/scheduling/roster/findings/finding";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";

export type FindingsMarkerProps = {
	/** What the marker is about; nothing renders without any. */
	findings: ReadonlyArray<Finding>;
	/** Names the marker and its popover, e.g. "2 notes for Ben Ong". */
	label: string;
	names: FindingNames;
	/** Opens the findings panel, where every finding is listed. */
	onShowAll: () => void;
	className?: string;
};

const key = "scheduling.findings";

/**
 * The outline icons of the app's set, in the warning tone: a triangle for
 * anything to look at (roster notes and setup warnings alike, never red, as
 * red is kept for errors and refusals), the info circle for what is only
 * information. Both tones keep 3:1 against the header and every shift tint.
 */
const TONE_ICONS: Record<FindingTone, { icon: Heroicon; colour: string }> = {
	error: { icon: AlertIcon, colour: "text-warning-900" },
	warning: { icon: AlertIcon, colour: "text-warning-900" },
	info: { icon: InfoIcon, colour: "text-ink-blue-700" },
};

/**
 * A small mark on a roster cell, row or day: an outline icon in the tone of
 * its most serious finding, then how many there are. It opens a popover
 * listing just those findings, roster notes first, then setup issues.
 */
export const FindingsMarker = ({
	findings,
	label,
	names,
	onShowAll,
	className,
}: FindingsMarkerProps): FunctionComponent => {
	const { t } = useTranslation();
	const titleId = useId();
	if (findings.length === 0) return null;
	const { icon: Icon, colour } = TONE_ICONS[strongestTone(findings)];
	const roster = findings.filter(
		(finding) => findingFamily(finding) === "roster"
	);
	const setup = findings.filter(
		(finding) => findingFamily(finding) === "setup"
	);
	const parts = [
		{ title: t(`${key}.marker.roster`), findings: roster },
		{ title: t(`${key}.marker.setup`), findings: setup },
	].filter((part) => part.findings.length > 0);

	return (
		<Popover className={joinClassNames("inline-flex", className)}>
			<PopoverButton
				aria-label={label}
				className="inline-flex h-6 min-w-6 cursor-pointer items-center justify-center gap-0.5 rounded px-0.5 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink-blue-500"
			>
				<Icon aria-hidden="true" className={joinClassNames("size-4", colour)} />
				<span
					aria-hidden="true"
					className="text-xs font-semibold text-neutral-800 tabular-nums"
				>
					{findings.length > 99 ? "99+" : findings.length}
				</span>
			</PopoverButton>
			<PopoverPanel
				focus
				anchor="bottom end"
				aria-labelledby={titleId}
				className="z-60 flex max-h-[min(28rem,calc(100dvh-2rem))] w-100 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-neutral-300 bg-white text-left font-normal text-neutral-900 shadow-xl outline-none [--anchor-gap:6px] [--anchor-padding:16px]"
				role="dialog"
			>
				{({ close }) => (
					<>
						<header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3">
							<h2 className="text-sm font-semibold" id={titleId}>
								{label}
							</h2>
							<Button
								aria-label={t(`${key}.marker.close`)}
								variant="icon"
								onClick={() => {
									close();
								}}
							>
								<CloseIcon />
							</Button>
						</header>
						<div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
							{parts.map((part) => (
								<section key={part.title}>
									<h3 className="mb-2 text-xs font-semibold tracking-wide text-neutral-700 uppercase">
										{part.title}
									</h3>
									<FindingList
										showDates
										findings={part.findings}
										names={names}
									/>
								</section>
							))}
						</div>
						<footer className="shrink-0 border-t border-neutral-200 px-5 py-3 text-right">
							<Button
								variant="textlink"
								onClick={() => {
									close();
									onShowAll();
								}}
							>
								{t(`${key}.showInFindings`)}
							</Button>
						</footer>
					</>
				)}
			</PopoverPanel>
		</Popover>
	);
};
