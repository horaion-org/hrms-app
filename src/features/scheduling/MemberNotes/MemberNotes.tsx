import { useId } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { formatDay } from "@/features/scheduling/periods";
import type { MemberFindings } from "@/features/scheduling/roster/findingsByMember";

export type MemberNotesProps = {
	groups: Array<MemberFindings>;
};

const key = "scheduling.generation";

/** The engine's errors by member, each message quoted in its own words (ADR-0003). */
export const MemberNotes = ({
	groups,
}: MemberNotesProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const titleId = useId();
	return (
		<section aria-labelledby={titleId} className="text-sm">
			<h3 className="font-semibold text-neutral-800" id={titleId}>
				{t(`${key}.byMember`)}
			</h3>
			<ul className="mt-3 flex flex-col gap-4">
				{groups.map(({ memberProfileId, name, entries }) => (
					<li key={memberProfileId ?? ""}>
						<p className="font-semibold text-neutral-900">
							{name ?? memberProfileId ?? t(`${key}.wholeRoster`)}
						</p>
						<ul className="mt-1 flex flex-col gap-1 text-neutral-800">
							{entries
								.flatMap(({ date, messages }) =>
									messages.map((message) => ({ date, message }))
								)
								.map(({ date, message }, index) => (
									// The engine may repeat a message; the list never reorders.
									<li key={index}>
										{date && (
											<span className="mr-2 text-neutral-700">
												{formatDay(date, language)}
											</span>
										)}
										<q>{message}</q>
									</li>
								))}
						</ul>
					</li>
				))}
			</ul>
		</section>
	);
};
