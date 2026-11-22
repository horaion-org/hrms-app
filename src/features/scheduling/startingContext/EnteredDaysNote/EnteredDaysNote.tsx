import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export type EnteredDaysNoteProps = {
	/** How many people on the roster have days entered by hand that it can show. */
	count: number;
	/** Shows the newest week holding one of those days. */
	onShowWeek: () => void;
	className?: string;
};

const key = "scheduling.startingContext.shown";

/**
 * Above a schedule's own roster: how many people have days entered by hand
 * before its run, with "Show them", which shows the newest week holding one.
 * Nothing when nobody has.
 */
export const EnteredDaysNote = ({
	count,
	onShowWeek,
	className,
}: EnteredDaysNoteProps): FunctionComponent => {
	const { t } = useTranslation();
	if (count === 0) return null;
	return (
		<Callout className={className} tone="neutral">
			{t(`${key}.note`, { count })}{" "}
			<Button variant="textlink" onClick={onShowWeek}>
				{t(`${key}.showThem`)}
			</Button>
		</Callout>
	);
};
