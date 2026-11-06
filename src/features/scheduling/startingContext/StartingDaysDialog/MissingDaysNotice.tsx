import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export type MissingDaysNoticeProps = {
	/** Missing days still blank in the grid. */
	count: number;
	onMarkOff: () => void;
	className?: string;
};

const key = "scheduling.startingContext";

/**
 * How many days still need an answer, with the quick way out: "Mark everyone
 * off" asks once, in this same line, so no second dialog opens over the grid.
 */
export const MissingDaysNotice = ({
	count,
	onMarkOff,
	className,
}: MissingDaysNoticeProps): FunctionComponent => {
	const { t } = useTranslation();
	const [confirming, setConfirming] = useState(false);
	return (
		<Callout className={className} tone="warning">
			<span className="flex flex-wrap items-center gap-x-4 gap-y-1">
				{confirming ? (
					<>
						<span>{t(`${key}.markOffConfirm`, { count })}</span>
						<Button
							variant="textlink"
							onClick={() => {
								setConfirming(false);
							}}
						>
							{t(`${key}.markOffCancel`)}
						</Button>
						<Button variant="textlink" onClick={onMarkOff}>
							{t(`${key}.markOffAccept`)}
						</Button>
					</>
				) : (
					<>
						<span>{t(`${key}.stillMissing`, { count })}</span>
						<Button
							variant="textlink"
							onClick={() => {
								setConfirming(true);
							}}
						>
							{t(`${key}.markOff`)}
						</Button>
					</>
				)}
			</span>
		</Callout>
	);
};
