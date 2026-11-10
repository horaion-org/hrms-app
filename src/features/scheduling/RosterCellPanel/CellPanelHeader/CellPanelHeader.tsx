import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/Icon";

export type CellPanelHeaderProps = {
	/** Names the panel through `aria-labelledby`. */
	titleId: string;
	title: string;
	/** The heading takes focus again whenever this changes, as when another day opens. */
	focusKey: string;
	onClose: () => void;
};

/**
 * The day editor's title and close button. Opening a day moves focus to the
 * title, which on a phone also scrolls the panel under the grid into view.
 */
export const CellPanelHeader = ({
	titleId,
	title,
	focusKey,
	onClose,
}: CellPanelHeaderProps): FunctionComponent => {
	const { t } = useTranslation();
	const heading = useRef<HTMLHeadingElement>(null);

	useEffect(() => {
		heading.current?.focus();
	}, [focusKey]);

	return (
		<div className="flex h-14 items-center justify-between px-4">
			<h2
				ref={heading}
				className="font-bold text-neutral-900 outline-none"
				id={titleId}
				tabIndex={-1}
			>
				{title}
			</h2>
			<Button
				aria-label={t("scheduling.rosterEdit.close")}
				variant="icon"
				onClick={onClose}
			>
				<CloseIcon />
			</Button>
		</div>
	);
};
