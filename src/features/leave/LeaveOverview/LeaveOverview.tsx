import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";
import { LeaveRequests } from "@/features/leave/LeaveRequests";
import { LeaveTimeline } from "@/features/leave/LeaveTimeline";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
import { sampleRequests } from "@/features/leave/sampleData";
import type { LeaveRequest } from "@/features/leave/types";

export const LeaveOverview = (): FunctionComponent => {
	const { t } = useTranslation();
	const [requests, setRequests] = useState(sampleRequests);
	const [country, setCountry] = useState("SG");
	const [branch, setBranch] = useState("main");
	const [message, setMessage] = useState("");
	const [dialog, setDialog] = useState<{
		request?: LeaveRequest;
		mode: "view" | "reject" | "apply";
	} | null>(null);
	const visible = requests.filter(
		(request) => request.country === country && request.branch === branch
	);
	const approve = (request: LeaveRequest): void => {
		setRequests((current) =>
			current.map((item) =>
				item.id === request.id && item.status === "pending"
					? { ...item, status: "approved" }
					: item
			)
		);
		setDialog(null);
		setMessage(t("leaveUi.approved"));
	};
	const open = (request: LeaveRequest, rejecting = false): void => {
		setDialog({ request, mode: rejecting ? "reject" : "view" });
	};
	return (
		<div>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="text-2xl font-semibold text-neutral-900 sm:text-[32px] sm:leading-11">
						{t("leaveUi.title")}
					</h1>
					<p className="mt-3 text-sm text-neutral-800">
						{t("leaveUi.subtitle")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-5 pt-1">
					<div className="flex items-center gap-3">
						<span className="text-sm text-neutral-800">
							{t("leaveUi.country")}
						</span>
						<Select
							aria-label={t("leaveUi.country")}
							className="w-44 font-semibold text-ink-blue-900"
							value={country}
							options={(["SG", "MY"] as const).map((value) => ({
								value,
								label: t(`leaveUi.countries.${value}`),
							}))}
							onChange={(value) => {
								setCountry(value);
								setBranch(value === "SG" ? "main" : "kl");
							}}
						/>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm text-neutral-800">
							{t("leaveUi.branch")}
						</span>
						<Select
							aria-label={t("leaveUi.branch")}
							className="w-44 font-semibold text-ink-blue-900"
							value={branch}
							options={(country === "SG"
								? (["main", "jurong"] as const)
								: (["kl"] as const)
							).map((value) => ({
								value,
								label: t(`leaveUi.branches.${value}`),
							}))}
							onChange={setBranch}
						/>
					</div>
				</div>
			</div>
			<p className="mt-3 text-xs text-neutral-600">{t("leaveUi.preview")}</p>
			<Tabs className="mt-8">
				<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
					<TabList aria-label={t("leaveUi.views")}>
						<Tab className="text-xl!">{t("leaveUi.requests")}</Tab>
						<Tab className="text-xl!">{t("leaveUi.timeline")}</Tab>
					</TabList>
					<Button
						className="bg-ink-blue-900! hover:bg-ink-blue-800!"
						disabled={visible.length === 0}
						leadingIcon={<PlusIcon />}
						onClick={() => {
							setDialog({ mode: "apply" });
						}}
					>
						{t("leaveUi.apply")}
					</Button>
				</div>
				<TabPanels>
					<TabPanel>
						<LeaveRequests
							key={`${country}-${branch}`}
							requests={visible}
							onApprove={approve}
							onOpen={open}
						/>
					</TabPanel>
					<TabPanel>
						<LeaveTimeline
							key={`${country}-${branch}`}
							requests={visible}
							onOpen={open}
						/>
					</TabPanel>
				</TabPanels>
			</Tabs>
			<p
				aria-live="polite"
				className="mt-4 text-sm text-success-800"
				role="status"
			>
				{message}
			</p>
			{dialog && (
				<LeaveRequestDialog
					key={`${dialog.request?.id ?? "new"}-${dialog.mode}`}
					employees={visible}
					mode={dialog.mode}
					request={dialog.request}
					onApprove={approve}
					onClose={() => {
						setDialog(null);
					}}
					onCreate={(request) => {
						setRequests((current) => [request, ...current]);
						setDialog(null);
						setMessage(t("leaveUi.applied"));
					}}
					onReject={(request, reason) => {
						setRequests((current) =>
							current.map((item) =>
								item.id === request.id && item.status === "pending"
									? { ...item, status: "rejected", reason }
									: item
							)
						);
						setDialog(null);
						setMessage(t("leaveUi.rejected"));
					}}
				/>
			)}
		</div>
	);
};
