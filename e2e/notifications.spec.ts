import { expect, test } from "@playwright/test";
import { mockSessionRoutes } from "./session";

for (const width of [1280, 375]) {
	test(`the notification panel opens, dismisses and navigates at ${width}px`, async ({
		context,
		page,
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		const session = await mockSessionRoutes(context);
		session.session = "active";
		let read = false;
		const notification = {
			notificationId: "n-1",
			type: "LEAVE_REQUEST_APPROVED",
			membershipId: "m-acme",
			leaveRequestId: "leave-1",
			occurredAt: "2026-10-18T08:00:00Z",
			createdAt: "2026-10-18T08:00:05Z",
		};
		await context.route("**/api/v1/me/workspace", (route) =>
			route.fulfill({
				json: {
					success: true,
					message: "OK",
					path: "/api/v1/me/workspace",
					timestamp: new Date().toISOString(),
					data: {
						companies: [
							{ uuid: "acme", name: "Acme", permissions: [], branches: [] },
						],
					},
				},
			})
		);
		await context.route(
			"**/api/v1/companies/acme/me/notifications**",
			(route) => {
				const url = new URL(route.request().url());
				if (route.request().method() === "PUT") {
					read = true;
					return route.fulfill({ json: { updatedCount: 1 } });
				}
				if (url.pathname.endsWith("unread-count"))
					return route.fulfill({ json: { unreadCount: read ? 0 : 1 } });
				return route.fulfill({
					json: {
						content: [
							{ ...notification, readAt: read ? notification.createdAt : null },
						],
						page: { totalElements: 1 },
					},
				});
			}
		);
		await context.route(
			"**/api/v1/companies/acme/me/leave-requests**",
			(route) => {
				if (new URL(route.request().url()).pathname.endsWith("leave-1"))
					return route.fulfill({
						json: {
							leaveRequestId: "leave-1",
							membershipId: "m-acme",
							employeeCode: "EMP-00001",
							displayName: "Owner",
							branchId: null,
							branchName: null,
							branchCountry: null,
							departmentId: null,
							departmentName: null,
							leaveType: "ANNUAL",
							startDate: "2026-10-19",
							endDate: "2026-10-19",
							workingDays: 1,
							status: "APPROVED",
							requestedAt: notification.occurredAt,
							requestedBy: { membershipId: "m-acme", displayName: "Owner" },
							reviewedAt: notification.occurredAt,
							reviewedBy: {
								membershipId: "m-reviewer",
								displayName: "Reviewer",
							},
							rejectionReason: null,
						},
					});
				return route.fulfill({
					json: {
						success: true,
						message: "OK",
						path: "/",
						timestamp: notification.occurredAt,
						data: { content: [], page: { totalElements: 0 } },
					},
				});
			}
		);
		await page.goto("/leave");
		const bell = page.getByRole("button", { name: "Notifications, 1 unread" });
		await bell.focus();
		await page.keyboard.press("Enter");
		const panel = page.getByRole("dialog", { name: "Notifications" });
		await expect(panel).toBeVisible();
		await expect(page).toHaveURL(/\/leave$/);
		await expect(
			panel.getByRole("link", { name: "Your leave request was approved." })
		).toBeVisible();
		const bounds = await panel.boundingBox();
		expect(bounds).not.toBeNull();
		expect(bounds!.x).toBeGreaterThanOrEqual(0);
		expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
		await page.screenshot({
			path: testInfo.outputPath("notifications-panel.png"),
		});
		await panel.getByRole("button", { name: "Show demo data" }).click();
		await expect(panel.getByText("Demo data", { exact: true })).toBeVisible();
		await expect(panel.getByRole("listitem")).toHaveCount(40);
		await expect(
			panel.getByRole("link", { name: "View all notifications" })
		).toBeInViewport();
		await page.screenshot({
			path: testInfo.outputPath("notifications-demo.png"),
		});
		await panel
			.getByRole("button", { name: "Show live notifications" })
			.click();
		await page.keyboard.press("Escape");
		await expect(panel).not.toBeVisible();
		await expect(bell).toBeFocused();
		await bell.click();
		await expect(panel).toBeVisible();
		await page.mouse.click(5, 5);
		await expect(panel).not.toBeVisible();
		await bell.click();
		await panel
			.getByRole("button", { name: "Mark as read", exact: true })
			.click();
		await expect(
			page.getByRole("button", { name: "Notifications, 0 unread" })
		).toBeVisible();
		await expect(panel).toBeVisible();
		await panel.getByRole("link", { name: "View all notifications" }).click();
		await expect(page).toHaveURL(/\/notifications$/);
		await expect(panel).not.toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Notifications", exact: true })
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Notifications, 0 unread" })
		).toBeVisible();
		await page.getByRole("button", { name: "Notifications, 0 unread" }).click();
		await panel
			.getByRole("link", { name: "Your leave request was approved." })
			.click();
		await expect(page.getByRole("dialog")).toBeAttached();
		await expect(page).toHaveURL(/requestId=leave-1/);
		await expect(panel).not.toBeVisible();
		await expect(
			page.getByRole("dialog").getByText("Approved", { exact: true })
		).toBeVisible();
	});
}
