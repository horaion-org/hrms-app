import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ActivityItem } from "@/components/ui/ActivityItem";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { useActivityPage } from "@/features/dashboard/useActivityPage";
import {
	activityDetails,
	describeActivity,
} from "@/features/organisation/activity";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";

const route = getRouteApi("/_authenticated/_app/activity");

const ACTIVITY_PAGE_SIZE = 10;

/** Everything that changed in the company, newest first, a page at a time. */
export const RecentActivity = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const companyId = useCurrentCompanyId();
	const { page = 1 } = route.useSearch();
	const navigate = route.useNavigate();
	const activity = useActivityPage(companyId, page, ACTIVITY_PAGE_SIZE);
	const now = new Date();

	return (
		<>
			<Button leadingIcon={<ArrowLeftIcon />} to="/" variant="textlink">
				{t("dashboard.activity.back")}
			</Button>
			<h1 className="mt-4 text-4xl font-medium text-neutral-900">
				{t("organisation.activity.title")}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">
				{t("dashboard.activity.subtitle")}
			</p>
			{activity.status === "hidden" && (
				<p className="mt-10 text-sm text-neutral-700">
					{t("dashboard.activity.hidden")}
				</p>
			)}
			{activity.status === "error" && (
				<p className="mt-10 text-sm text-error-700" role="alert">
					{t("organisation.activity.failed")}
				</p>
			)}
			{activity.status === "ready" && activity.items.length === 0 && (
				<p className="mt-10 text-sm text-neutral-700">
					{t("organisation.activity.empty")}
				</p>
			)}
			{activity.status === "ready" && activity.items.length > 0 && (
				<>
					<ul className="mt-10 flex flex-col gap-7">
						{activity.items.map((event) => {
							const described = describeActivity(event, t);
							if (!described) return null;
							return (
								<li key={described.id}>
									<ActivityItem
										details={activityDetails(event, t, now, language)}
										icon={described.icon}
										title={described.title}
									/>
								</li>
							);
						})}
					</ul>
					<Pagination
						page={page}
						pageSize={ACTIVITY_PAGE_SIZE}
						total={activity.total}
						onPageChange={(next) => {
							void navigate({
								search: { page: next === 1 ? undefined : next },
							});
						}}
					/>
				</>
			)}
		</>
	);
};
