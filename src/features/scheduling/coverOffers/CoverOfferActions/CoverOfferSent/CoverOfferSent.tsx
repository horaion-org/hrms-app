import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { TimeIcon } from "@/components/ui/Icon";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import type { CoverOfferRefusal } from "@/features/scheduling/coverOffers/coverOfferRefusal";
import { formatOfferTime } from "@/features/scheduling/coverOffers/coverOfferRules";

export type CoverOfferSentProps = {
	/** The member the offer went to, as the panel names them. */
	name: string;
	offer: CoverOffer;
	/** The roster's time zone, which the deadline reads in. */
	timeZone: string;
	withdrawing?: boolean;
	/** Why the withdrawal didn't go through, if it didn't. */
	refusal?: CoverOfferRefusal;
	onWithdraw: (offerId: string) => void;
	/** The clock, for tests and stories; now by default. */
	now?: () => Date;
};

const key = "scheduling.coverOffers.actions";

/**
 * An offer out for this member and day, in the cell panel: who it went to
 * and by when they answer, the remark they read, and Withdraw.
 */
export const CoverOfferSent = ({
	name,
	offer,
	timeZone,
	withdrawing = false,
	refusal,
	onWithdraw,
	now = (): Date => new Date(),
}: CoverOfferSentProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	return (
		<div className="flex flex-col items-start gap-2 text-sm">
			<p className="flex items-center gap-2 text-neutral-900">
				<TimeIcon aria-hidden="true" className="size-4 text-ink-blue-700" />
				<span>
					{t(`${key}.sent`, {
						name,
						time: offer.expiresAt
							? formatOfferTime(offer.expiresAt, language, timeZone, now())
							: "",
					})}
				</span>
			</p>
			{offer.remark && <q className="text-neutral-800">{offer.remark}</q>}
			{refusal && (
				<p className="text-error-700" role="alert">
					{t(`${key}.error.${refusal}`, { name })}
				</p>
			)}
			<Button
				disabled={withdrawing}
				variant="textlink"
				onClick={() => {
					onWithdraw(offer.offerId);
				}}
			>
				{t(`${key}.withdraw`)}
			</Button>
		</div>
	);
};
