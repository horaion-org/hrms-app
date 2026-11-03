import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import type { MemberProfileDetail } from "@/features/people/api";
import { myAvailabilityQuery } from "@/features/people/availability/api";
import { AvailabilityCard } from "@/features/people/availability/AvailabilityCard";
import {
	isPartTime,
	PATTERN_SCOPE,
	type AvailabilityScope,
} from "@/features/people/availability/availabilityModel";
import { useEffectiveAvailability } from "@/features/people/availability/useAvailability";
import { WeekSelector } from "@/features/people/availability/WeekSelector";

export type MyAvailabilityCardProps = {
	companyId: string;
	/** The caller's own profile; nothing is drawn unless they are part-time. */
	profile: Pick<MemberProfileDetail, "employmentType">;
	className?: string;
};

/**
 * The caller's own availability, read-only: the default pattern or one of
 * the coming weeks, as their colleagues' cards show it, without editing.
 */
export const MyAvailabilityCard = ({
	companyId,
	profile,
	className,
}: MyAvailabilityCardProps): FunctionComponent => {
	const [scope, setScope] = useState<AvailabilityScope>(PATTERN_SCOPE);
	const partTime = isPartTime(profile.employmentType);
	const loaded = useQuery(myAvailabilityQuery(companyId, partTime));
	const { windows, failed } = useEffectiveAvailability(
		companyId,
		{ kind: "me" },
		loaded.data,
		scope
	);
	if (!partTime) return null;
	return (
		<AvailabilityCard
			className={className}
			failed={loaded.isError || failed}
			windows={windows}
			titleAside={
				loaded.data && (
					<WeekSelector
						overrideWeeks={loaded.data.overrideWeeks}
						scope={scope}
						onChange={setScope}
					/>
				)
			}
		/>
	);
};
