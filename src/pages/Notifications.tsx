import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { NotificationViews } from "@/features/notifications/NotificationViews";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/organisation/useCurrentCompanyId";

const CompanyNotifications = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div>
			<h1 className="text-4xl font-medium">{t("notifications.title")}</h1>
			<div className="mt-8">
				<NotificationViews />
			</div>
		</div>
	);
};

export const Notifications = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const membershipId = useCurrentMembershipId();
	return <CompanyNotifications key={`${companyId}:${membershipId}`} />;
};
