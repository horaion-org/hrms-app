import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { CheckLine } from "@/features/scheduling/rulesCheck/checkLine";

export type IssuesPanelHeadProps = {
	/** How many rows must be fixed. */
	mustFix: number;
	/** Where the rules check stands; no check line for someone who may not run it. */
	checkLine?: CheckLine;
	/** Runs the rules check (again). */
	onCheck: () => void;
};

const key = "scheduling.issues.panel";

/** A clock time as the page writes it: "15:42". */
const clockOf = (epochMilliseconds: number, language: string): string =>
	new Intl.DateTimeFormat(language, {
		hour: "2-digit",
		minute: "2-digit",
	}).format(epochMilliseconds);

/** The check line's words and its action, by its state. */
const useCheckWords = (
	line: CheckLine
): { text: string; action?: string; alert?: boolean } => {
	const { t, i18n } = useTranslation();
	switch (line.state) {
		case "checking":
			return { text: t(`${key}.checking`) };
		case "refused":
			return {
				text: t(`scheduling.rulesCheck.refusal.${line.refusal}`),
				action: line.canRetry ? t("scheduling.rosterEdit.tryAgain") : undefined,
				alert: true,
			};
		case "unchecked":
			return { text: t(`${key}.unchecked`), action: t(`${key}.checkNow`) };
		case "checked": {
			const time =
				line.checkedAt === undefined
					? ""
					: clockOf(line.checkedAt, formattingLocale(i18n));
			return {
				text: t(line.incomplete ? `${key}.checkedIncomplete` : `${key}.checked`, {
					time,
				}),
				action: t(`${key}.checkAgain`),
			};
		}
		default:
			return { text: t(`${key}.asGenerated`), action: t(`${key}.check`) };
	}
};

/** The rules check's line: where it stands and the one action that runs it again. */
const CheckLineText = ({
	line,
	onCheck,
}: {
	line: CheckLine;
	onCheck: () => void;
}): FunctionComponent => {
	const { text, action, alert } = useCheckWords(line);
	return (
		<span
			aria-live="polite"
			className="text-sm text-neutral-700"
			role={alert ? "alert" : undefined}
		>
			{text}
			{action && (
				<>
					{" · "}
					<Button variant="textlink" onClick={onCheck}>
						{action}
					</Button>
				</>
			)}
		</span>
	);
};

/**
 * The line under the Issues title: "3 to fix" in red, then the rules check,
 * "Checked 15:42 · Check again", which stands in for Validate schedule's own
 * section.
 */
export const IssuesPanelHead = ({
	mustFix,
	checkLine,
	onCheck,
}: IssuesPanelHeadProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
			{mustFix > 0 && (
				<Badge compact tone="error">
					{t(`${key}.toFix`, { count: mustFix })}
				</Badge>
			)}
			{checkLine && <CheckLineText line={checkLine} onCheck={onCheck} />}
		</div>
	);
};
