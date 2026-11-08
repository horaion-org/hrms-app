import type { TFunction } from "i18next";
import type { PayWords } from "@/features/scheduling/coverOffers/coverOfferRules";

/** An offer's pay in words (Q3 = A): "Overtime · 6 h", "Same hours, different shift". */
export const payText = (pay: PayWords, t: TFunction): string =>
	pay.key === "overtime"
		? t("scheduling.coverOffers.pay.overtime", { hours: pay.hours })
		: t(`scheduling.coverOffers.pay.${pay.key}`);
