import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowUpIcon } from "@/components/ui/Icon";
import { UpgradePlanDialog } from "@/features/settings/UpgradePlanDialog";

const PLAN_DETAILS = ["pricing", "features"] as const;

/** Plan information is preview content until a billing contract is available. */
export const PlanSettings = (): FunctionComponent => {
	const { t } = useTranslation();
	const [upgradeOpen, setUpgradeOpen] = useState(false);
	return (
		<>
			<h2 className="text-xl font-semibold text-neutral-900">
				{t("settings.plan.title")}
			</h2>
			<p className="mt-3 text-sm text-neutral-800">
				{t("settings.plan.description")}
			</p>
			<p className="mt-6 rounded-lg bg-neutral-100 p-4 text-sm text-neutral-700">
				{t("settings.plan.preview")}
			</p>
			<div className="mt-6 grid gap-6 xl:grid-cols-2">
				<div className="rounded-xl border border-neutral-300 p-5">
					<p className="text-sm text-neutral-600">
						{t("settings.plan.current")}
					</p>
					<h3 className="mt-2 text-xl font-semibold text-neutral-900">
						{t("settings.plan.free")}
					</h3>
					<p className="mt-3 text-sm text-neutral-700">
						{t("settings.plan.freeDescription")}
					</p>
				</div>
				<div className="rounded-xl border border-ink-blue-200 bg-ink-blue-50 p-5">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 className="text-xl font-semibold text-ink-blue-900">
							{t("settings.upgrade.plan")}
						</h3>
						<Badge>{t("settings.upgrade.comingSoon")}</Badge>
					</div>
					<p className="mt-3 text-sm text-neutral-700">
						{t("settings.upgrade.details")}
					</p>
					<dl className="mt-5 space-y-3 text-sm">
						{PLAN_DETAILS.map((detail) => (
							<div
								key={detail}
								className="flex flex-wrap justify-between gap-2"
							>
								<dt className="text-neutral-700">
									{t(`settings.plan.${detail}`)}
								</dt>
								<dd className="font-medium text-neutral-900">
									{t("settings.plan.toBeAnnounced")}
								</dd>
							</div>
						))}
					</dl>
					<div className="mt-6 flex justify-end">
						<Button
							aria-haspopup="dialog"
							leadingIcon={<ArrowUpIcon />}
							size="sm"
							onClick={() => {
								setUpgradeOpen(true);
							}}
						>
							{t("settings.upgrade.action")}
						</Button>
					</div>
				</div>
			</div>
			<div className="mt-8 border-t border-neutral-200 pt-6">
				<h3 className="text-base font-semibold text-neutral-900">
					{t("settings.plan.billing")}
				</h3>
				<p className="mt-3 text-sm text-neutral-700">
					{t("settings.plan.billingPlaceholder")}
				</p>
			</div>
			{upgradeOpen && (
				<UpgradePlanDialog
					onClose={() => {
						setUpgradeOpen(false);
					}}
				/>
			)}
		</>
	);
};
