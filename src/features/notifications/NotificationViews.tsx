import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Tabs, Tab, TabList, TabPanels, TabPanel } from "@/components/ui/Tabs";
import { NotificationList } from "@/features/notifications/NotificationList";
import { useAccess } from "@/features/workspace/useAccess";

/** The inbox and bell panel share the same audience selection and permission-withdrawal behaviour. */
export const NotificationViews = ({
	compact = false,
	onNavigate,
}: {
	compact?: boolean;
	onNavigate?: () => void;
}): FunctionComponent => {
	const { t } = useTranslation();
	const [selected, setSelected] = useState(0);
	const access = useAccess();
	const canReview = access.canAnywhere("leave_request:review");
	return (
		<Tabs selectedIndex={canReview ? selected : 0} onChange={setSelected}>
			<TabList aria-label={t("notifications.audiences")}>
				<Tab>{t("notifications.personal")}</Tab>
				{canReview && <Tab>{t("notifications.review")}</Tab>}
			</TabList>
			<TabPanels>
				<TabPanel>
					<NotificationList
						audience="PERSONAL"
						compact={compact}
						onNavigate={onNavigate}
					/>
				</TabPanel>
				{canReview && (
					<TabPanel>
						<NotificationList
							audience="REVIEW"
							compact={compact}
							onNavigate={onNavigate}
						/>
					</TabPanel>
				)}
			</TabPanels>
		</Tabs>
	);
};
