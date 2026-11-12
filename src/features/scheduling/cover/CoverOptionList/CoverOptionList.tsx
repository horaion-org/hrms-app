import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/** How many options show before "Show more". */
export const OPTIONS_SHOWN_FIRST = 5;

/** One way to cover the shift, already in words. */
export type CoverOptionItem = {
	membershipId: string;
	name: string;
	lines: ReadonlyArray<string>;
};

/** Someone who can't cover it, with the first reason in words. */
export type CoverUnavailableItem = {
	membershipId: string;
	name: string;
	reason: string;
};

export type CoverOptionListProps = {
	/** The options, best first; the first is marked Suggested. */
	options: ReadonlyArray<CoverOptionItem>;
	/** The chosen option's membership id. */
	selected: string | undefined;
	onSelect: (membershipId: string) => void;
	unavailable: ReadonlyArray<CoverUnavailableItem>;
	/** Opens "Can't help" from the start, as when nobody can cover. */
	unavailableOpen?: boolean;
	/** Groups the radios; unique per panel. */
	radioName: string;
};

const key = "scheduling.cover.list";

/**
 * Who could cover a short shift: the options as radio cards, best first and
 * the first marked Suggested, five at a time with "Show more", then a
 * collapsed "Can't help" list with each person's reason. The disclosure is a
 * real button, so every reason is reachable without hovering.
 */
export const CoverOptionList = ({
	options,
	selected,
	onSelect,
	unavailable,
	unavailableOpen = false,
	radioName,
}: CoverOptionListProps): FunctionComponent => {
	const { t } = useTranslation();
	const headingId = useId();
	const cantHelpId = useId();
	const [showAll, setShowAll] = useState(false);
	const [cantHelpShown, setCantHelpShown] = useState(unavailableOpen);
	const shown = showAll ? options : options.slice(0, OPTIONS_SHOWN_FIRST);
	const hiddenCount = options.length - OPTIONS_SHOWN_FIRST;

	return (
		<div className="flex flex-col gap-3">
			{options.length > 0 && (
				<>
					<h3 className="text-sm font-medium text-neutral-800" id={headingId}>
						{t(`${key}.whoCovers`)}
					</h3>
					<div
						aria-labelledby={headingId}
						className="flex flex-col gap-2"
						role="radiogroup"
					>
						{shown.map((option, index) => (
							<RadioCard
								key={option.membershipId}
								checked={selected === option.membershipId}
								label={option.name}
								name={radioName}
								value={option.membershipId}
								description={
									<>
										{index === 0 && (
											<Badge compact className="mb-1">
												{t(`${key}.suggested`)}
											</Badge>
										)}
										{option.lines.map((line) => (
											<span key={line} className="block">
												{line}
											</span>
										))}
									</>
								}
								onChange={onSelect}
							/>
						))}
					</div>
					{hiddenCount > 0 && (
						<Button
							className="self-start"
							variant="textlink"
							onClick={() => {
								setShowAll(!showAll);
							}}
						>
							{showAll
								? t(`${key}.showFewer`)
								: t(`${key}.showMore`, { count: hiddenCount })}
						</Button>
					)}
				</>
			)}
			{unavailable.length > 0 && (
				<div className="flex flex-col gap-1">
					<Button
						aria-controls={cantHelpId}
						aria-expanded={cantHelpShown}
						className="self-start"
						variant="textlink"
						onClick={() => {
							setCantHelpShown(!cantHelpShown);
						}}
					>
						{t(`${key}.cantHelp`, { count: unavailable.length })}
					</Button>
					<ul
						className="flex flex-col gap-1 text-sm text-neutral-800"
						hidden={!cantHelpShown}
						id={cantHelpId}
					>
						{unavailable.map((person) => (
							<li key={person.membershipId}>
								{t(`${key}.cantHelpLine`, {
									name: person.name,
									reason: person.reason,
								})}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};
