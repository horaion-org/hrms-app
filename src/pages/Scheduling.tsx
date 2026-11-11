import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { SchedulesTab } from "@/features/scheduling/SchedulesTab";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const key = "scheduling.overview";

const route = getRouteApi("/_authenticated/_app/scheduling");

/**
 * Scheduling: the schedules in the header's Branch, narrowed to a
 * Department from the Filters; both are kept in the URL.
 */
export const Scheduling = (): FunctionComponent => {
	const { t } = useTranslation();
	const companyId = useCurrentCompanyId();
	const navigate = route.useNavigate();
	const units = useUnitSelection(
		companyId,
		SCHEDULE_READ_KEYS,
		unitSelectionOf(route.useSearch()),
		SCHEDULING_UNIT_RULES
	);
	const chooseDepartment = (department: string | undefined): void => {
		void navigate({ search: (previous) => ({ ...previous, department }) });
	};

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t(`${key}.title`)}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
			<SchedulesTab
				companyId={companyId}
				units={units}
				onDepartmentChange={chooseDepartment}
			/>
		</>
	);
};
