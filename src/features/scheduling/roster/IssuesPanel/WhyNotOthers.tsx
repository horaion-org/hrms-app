import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Disclosure } from "@/components/ui/Disclosure";
import {
	reasonText,
	type CoverShift,
} from "@/features/scheduling/cover/coverOptionWords";
import type { CoverUnavailable } from "@/features/scheduling/cover/api";

export type WhyNotOthersProps = {
	/** The people of the hours-based list who can't help, by the backend's reason. */
	people: ReadonlyArray<CoverUnavailable>;
	/** A member's name by membership id. */
	memberName: (membershipId: string) => string;
	/** The short shift, whose job titles a reason may name. */
	shift: CoverShift | undefined;
};

/** "Why not others (n)", closed until opened: one line per person who can't help, "Ben Ong · On leave". Nothing without anyone. */
export const WhyNotOthers = ({
	people,
	memberName,
	shift,
}: WhyNotOthersProps): FunctionComponent => {
	const { t } = useTranslation();
	if (people.length === 0) return null;
	return (
		<Disclosure
			title={t("scheduling.issues.cover.whyNot", { count: people.length })}
			variant="inline"
		>
			<ul className="flex flex-col gap-1 text-neutral-800">
				{people.map((person) => (
					<li key={person.membershipId}>
						{t("scheduling.cover.list.cantHelpLine", {
							name: memberName(person.membershipId),
							reason: reasonText(person.reason, shift, t),
						})}
					</li>
				))}
			</ul>
		</Disclosure>
	);
};
