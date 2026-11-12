import type { TFunction } from "i18next";
import type { PayWords } from "@/features/scheduling/coverOffers/coverOfferRules";

/**
 * An offer's pay in words (Q3 = A): "Overtime · 6 h", "Extra hours
 * (part-time) · 4 h", "Within contracted hours".
 */
export const payText = (pay: PayWords, t: TFunction): string =>
	pay.key === "overtime" || pay.key === "extraHours"
		? t(`scheduling.coverOffers.pay.${pay.key}`, { hours: pay.hours })
		: t(`scheduling.coverOffers.pay.${pay.key}`);
