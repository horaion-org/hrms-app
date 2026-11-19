import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { scheduleSetupLink } from "@/features/scheduling/schedules/scheduleViewLink";
import { startingDaysQuery } from "@/features/scheduling/startingContext/api";
import { peopleWithEnteredDays } from "@/features/scheduling/startingContext/enteredDays";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";

export type EnteredDaysNoteProps = {
	/** The schedule whose run the days were entered for. */
	schedule: Pick<Schedule, "scheduleId" | "branchId" | "departmentId">;
	className?: string;
};

const key = "scheduling.startingContext.shown";

/**
 * On a schedule's own page: how many people have days entered by hand before
 * its run, with the link to its set-up, where those days show. Nothing when
 * nobody has, while the read is under way, or for someone who may not read
 * the Department's schedules (`schedule:read`), who is never asked for them.
 */
export const EnteredDaysNote = ({
	schedule,
	className,
}: EnteredDaysNoteProps): FunctionComponent => {
	const { t } = useTranslation();
	const companyId = useCurrentCompanyId();
	const mayRead = useAccess().can(
		"schedule:read",
		departmentScope(schedule.departmentId)
	);
	const startingDays = useQuery(
		startingDaysQuery(
			companyId,
			{ branchId: schedule.branchId, departmentId: schedule.departmentId },
			schedule.scheduleId,
			mayRead
		)
	);
	const count = startingDays.data
		? peopleWithEnteredDays(startingDays.data)
		: 0;
	if (count === 0) return null;
	return (
		<Callout className={className} tone="neutral">
			{t(`${key}.note`, { count })}{" "}
			<Button {...scheduleSetupLink(schedule)} variant="textlink">
				{t("scheduling.detail.viewSetup")}
			</Button>
		</Callout>
	);
};
