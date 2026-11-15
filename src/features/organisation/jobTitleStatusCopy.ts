import type { TFunction } from "i18next";
import type { JobTitle } from "@/features/organisation/api";

/**
 * What the status confirm says; deactivating a title people hold names how
 * many keep it, and how many rules name it and will need attention when
 * `namedBy` is known.
 */
export const jobTitleStatusCopy = (
	jobTitle: JobTitle,
	t: TFunction,
	namedBy?: number
): { title: string; description: string; confirmLabel: string } => {
	const key = "organisation.jobTitles.status";
	if (jobTitle.status === "INACTIVE")
		return {
			title: t(`${key}.activateTitle`, { name: jobTitle.name }),
			description: t(`${key}.activateDescription`),
			confirmLabel: t(`${key}.activateConfirm`),
		};
	const count = jobTitle.holderCount;
	const description =
		count > 0
			? t(`${key}.deactivateDescriptionHeld`, { count })
			: t(`${key}.deactivateDescription`);
	const named = namedBy
		? t(`${key}.namedByConstraints`, { count: namedBy })
		: undefined;
	return {
		title: t(`${key}.deactivateTitle`, { name: jobTitle.name }),
		description: named ? `${description} ${named}` : description,
		confirmLabel:
			count > 0
				? t(`${key}.deactivateConfirmHeld`, { count })
				: t(`${key}.deactivateConfirm`),
	};
};
