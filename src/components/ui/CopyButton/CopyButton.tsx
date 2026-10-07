import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { CopyIcon, TickIcon } from "@/components/ui/Icon";

export type CopyButtonProps = {
	/** The text put on the clipboard. */
	value: string;
	/** The button's accessible name, e.g. "Copy email address". */
	label: string;
	className?: string;
};

/** How long the outcome stays shown before the button resets. */
const RESET_AFTER_MS = 2000;

/**
 * An icon button that copies `value` to the clipboard, shows a tick for a
 * moment, and announces whether it worked.
 */
export const CopyButton = ({
	value,
	label,
	className,
}: CopyButtonProps): FunctionComponent => {
	const { t } = useTranslation();
	const [outcome, setOutcome] = useState<"copied" | "failed">();
	useEffect(() => {
		if (!outcome) return;
		const timeout = setTimeout(() => {
			setOutcome(undefined);
		}, RESET_AFTER_MS);
		return (): void => {
			clearTimeout(timeout);
		};
	}, [outcome]);

	return (
		<>
			<Button
				aria-label={label}
				className={className}
				variant="icon"
				onClick={() => {
					// The Clipboard API is missing outside a secure context, so a throw counts as a failure too.
					void Promise.resolve()
						.then(() => navigator.clipboard.writeText(value))
						.then(
							() => {
								setOutcome("copied");
							},
							() => {
								setOutcome("failed");
							}
						);
				}}
			>
				{outcome === "copied" ? <TickIcon /> : <CopyIcon />}
			</Button>
			<span className="sr-only" role="status">
				{outcome ? t(`copyButton.${outcome}`) : ""}
			</span>
		</>
	);
};
