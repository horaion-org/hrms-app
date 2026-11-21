import type { TFunction } from "i18next";
import type { PayWords } from "@/features/scheduling/coverOffers/coverOfferRules";

/**
 * An offer's pay in words (Q3 = A): "Overtime · 6 h", "Extra hours
 * (part-time) · 4 h", "Within contracted hours", "Work Sat, Oct 17 instead
 * of Fri, Oct 16, same hours". `dayName` writes a day as the page does.
 */
export const payText = (
	pay: PayWords,
	t: TFunction,
	dayName: (isoDate: string) => string
): string => {
	switch (pay.key) {
		case "overtime":
		case "extraHours":
			return t(`scheduling.coverOffers.pay.${pay.key}`, { hours: pay.hours });
		case "daySwap":
			return t("scheduling.coverOffers.pay.daySwap", {
				day: dayName(pay.day),
				dayGivenUp: dayName(pay.dayGivenUp),
			});
		default:
			return t(`scheduling.coverOffers.pay.${pay.key}`);
	}
};
