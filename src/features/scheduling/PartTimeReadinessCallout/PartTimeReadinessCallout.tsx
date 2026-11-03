import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { MemberWithoutAvailability } from "@/features/people/availability/api";

export type PartTimeReadinessCalloutProps = {
	/** The Department's part-timers without any availability. */
	members: ReadonlyArray<MemberWithoutAvailability>;
	className?: string;
};

/**
 * Warns, before generating, that the Department's part-time members without
 * availability will be left off the roster, each linked to their profile to
 * add it. Generating still goes ahead. Nothing is drawn when there are none.
 */
export const PartTimeReadinessCallout = ({
	members,
	className,
}: PartTimeReadinessCalloutProps): FunctionComponent => {
	const { t } = useTranslation();
	if (members.length === 0) return null;
	return (
		<Callout className={className} tone="warning">
			{t("scheduling.setup.partTimeWithoutAvailability", {
				count: members.length,
			})}
			<ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
				{members.map((member) => (
					<li key={member.membershipId}>
						<Button
							params={{ membershipId: member.membershipId }}
							to="/people/$membershipId"
							variant="textlink"
						>
							{member.displayName}
						</Button>
					</li>
				))}
			</ul>
		</Callout>
	);
};
