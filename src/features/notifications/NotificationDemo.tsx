import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Tabs, Tab, TabList, TabPanels, TabPanel } from "@/components/ui/Tabs";
import { notificationDemoFixtures } from "@/features/notifications/fixtures";
import { NotificationRow } from "@/features/notifications/NotificationRow";

/** Development-only layout preview. Acknowledgements update local examples, never server data. */
export const NotificationDemo = (): FunctionComponent => {
	const { t } = useTranslation();
	const [notifications, setNotifications] = useState(notificationDemoFixtures);
	const personal = notifications.filter(
		(item) => item.type !== "LEAVE_REQUEST_SUBMITTED"
	);
	const review = notifications.filter(
		(item) => item.type === "LEAVE_REQUEST_SUBMITTED"
	);
	return (
		<div>
			<p className="mb-4 text-sm text-neutral-700">
				{t("notifications.demoHint")}
			</p>
			<Tabs>
				<TabList aria-label={t("notifications.audiences")}>
					<Tab count={personal.filter((item) => !item.readAt).length}>
						{t("notifications.personal")}
					</Tab>
					<Tab count={review.filter((item) => !item.readAt).length}>
						{t("notifications.review")}
					</Tab>
				</TabList>
				<TabPanels>
					{[
						{ audience: "PERSONAL", items: personal },
						{ audience: "REVIEW", items: review },
					].map(({ audience, items }) => (
						<TabPanel key={audience}>
							<ul className="divide-y divide-neutral-300">
								{items.map((notification) => (
									<li key={notification.notificationId}>
										<NotificationRow
											notification={notification}
											onRead={() => {
												const readAt = new Date().toISOString();
												setNotifications((previous) =>
													previous.map((item) =>
														item.notificationId === notification.notificationId
															? { ...item, readAt }
															: item
													)
												);
											}}
										>
											<span
												className={`text-ink-blue-900 ${notification.readAt ? "" : "font-semibold"}`}
											>
												{t(`notifications.types.${notification.type}`)}
											</span>
										</NotificationRow>
									</li>
								))}
							</ul>
						</TabPanel>
					))}
				</TabPanels>
			</Tabs>
		</div>
	);
};
