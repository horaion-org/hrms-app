import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	CoverOfferActions,
	type CoverOfferActionsProps,
} from "@/features/scheduling/coverOffers/CoverOfferActions";

export type CellPanelFooterProps = {
	applyLabel: string;
	/** Apply waits until what the review asks for is given. */
	applyDisabled: boolean;
	/** A change or leave move is in flight. */
	busy: boolean;
	onApply: () => void;
	onCancel: () => void;
	/**
	 * Given when the change needs the member's yes (a published roster's
	 * change that adds or moves work): the offer's actions replace Cancel and
	 * Apply.
	 */
	offerActions?: CoverOfferActionsProps;
};

/** Cancel and Apply under a review in the day editor, or the cover offer's actions in their place. */
export const CellPanelFooter = ({
	applyLabel,
	applyDisabled,
	busy,
	onApply,
	onCancel,
	offerActions,
}: CellPanelFooterProps): FunctionComponent => {
	const { t } = useTranslation();
	if (offerActions) return <CoverOfferActions {...offerActions} />;
	return (
		<div className="flex justify-end gap-3">
			<Button size="sm" variant="secondary" onClick={onCancel}>
				{t("scheduling.rosterEdit.cancel")}
			</Button>
			<Button
				disabled={applyDisabled}
				loading={busy}
				size="sm"
				onClick={onApply}
			>
				{applyLabel}
			</Button>
		</div>
	);
};
