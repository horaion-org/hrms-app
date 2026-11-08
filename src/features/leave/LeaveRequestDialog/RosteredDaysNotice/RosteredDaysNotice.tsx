import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import type { RosteredDay } from "@/features/leave/api";

export type RosteredDaysNoticeProps = {
	days: ReadonlyArray<RosteredDay>;
	/** Who is rostered; left out when it is the person reading. */
	name?: string;
	/** With a value, the reader must confirm taking the person off the shifts. */
	confirmed?: boolean;
	onConfirmedChange?: (confirmed: boolean) => void;
	/** With it, reading the days failed and they can't be confirmed: offers trying again. */
	onRetry?: () => void;
};

const dayFormat = (language: string): Intl.DateTimeFormat =>
	new Intl.DateTimeFormat(language, {
		weekday: "short",
		day: "numeric",
		month: "short",
	});

/** The rostered days of a leave period; nothing at all when there are none. */
export const RosteredDaysNotice = ({
	days,
	name,
	confirmed,
	onConfirmedChange,
	onRetry,
}: RosteredDaysNoticeProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	if (onRetry)
		return (
			<Callout tone="warning">
				{t("leave.rosteredCheckFailed")}{" "}
				<Button variant="textlink" onClick={onRetry}>
					{t("leave.retry")}
				</Button>
			</Callout>
		);
	if (days.length === 0) return null;
	const format = dayFormat(formattingLocale(i18n));
	const list = new Intl.ListFormat(i18n.language).format(
		days.map(({ day }) => format.format(new Date(`${day}T12:00:00`)))
	);
	return (
		<div className="space-y-3">
			<Callout tone={confirmed === undefined ? "info" : "warning"}>
				{name === undefined
					? t("leave.rosteredOwn", { days: list })
					: t("leave.rosteredOther", { name, days: list })}
			</Callout>
			{confirmed !== undefined && (
				<Checkbox
					checked={confirmed}
					label={
						name === undefined
							? t("leave.rosteredConfirmEmployee")
							: t("leave.rosteredConfirm", { name })
					}
					onChange={(event) => {
						onConfirmedChange?.(event.target.checked);
					}}
				/>
			)}
		</div>
	);
};
