import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/Icon";
import type { PanelItem } from "@/features/scheduling/roster/rosterPanels";
import { FocusSidePanelHeading } from "./focusSidePanelHeading";

/** One part of the panel: an optional heading, then a list of items or other content. */
export type RosterSidePanelSection = {
	key: string;
	title?: string;
	items?: ReadonlyArray<PanelItem>;
	content?: ReactNode;
};

/** A section with neither items nor content is left out, heading and all. */
const hasSomething = ({ items, content }: RosterSidePanelSection): boolean =>
	(items?.length ?? 0) > 0 || Boolean(content);

/** Layers that handle their own Escape: a key pressed in one of them is theirs, not the panel's. */
const OWN_ESCAPE_LAYERS = '[role="dialog"], [role="menu"], [role="listbox"]';

/** Whether a key was pressed inside a dialog, menu or list of options, which closes itself on Escape. */
const insideOwnEscapeLayer = (target: EventTarget | null): boolean =>
	target instanceof Element && target.closest(OWN_ESCAPE_LAYERS) !== null;

/** An item's first line reads in the body tone and any later line a step lighter. */
const lineTone = (index: number): string =>
	index === 0 ? "text-neutral-800" : "text-neutral-700";

export type RosterSidePanelProps = {
	/** Lets the button that opens the panel name it in `aria-controls`. */
	id?: string;
	title: string;
	/** One line under the title that stays while the list scrolls, such as the Issues counts. */
	summary?: ReactNode;
	sections: ReadonlyArray<RosterSidePanelSection>;
	onClose: () => void;
	className?: string;
};

/**
 * The roster's right-hand panel for its lists (Issues, Changed, Details),
 * in the same slot, width and frame as the day editor: beside the grid from
 * `lg` up, under it on a phone. Every list is drawn from sections, so each
 * reads alike: a heading, its items one under another (titled items set
 * apart by a rule, each with an optional button under its lines), then any
 * other content; a section with nothing in it is left out. Its heading takes focus when it opens. Escape anywhere on
 * the page (outside a dialog or menu) or the close button closes it, and focus goes back to what opened it: a menu
 * item that opened it is gone by then, and the menu has already given focus back to its own button.
 */
export const RosterSidePanel = ({
	id,
	title,
	summary,
	sections,
	onClose,
	className,
}: RosterSidePanelProps): FunctionComponent => {
	const { t } = useTranslation();
	const titleId = useId();
	const heading = useRef<HTMLHeadingElement>(null);
	// What had focus as the panel opened, read on the first render, before the heading takes focus.
	const opener = useRef(document.activeElement);
	const focusHeading = useCallback((): void => {
		heading.current?.focus();
	}, []);
	useEffect(() => {
		focusHeading();
	}, [focusHeading]);
	const close = useCallback((): void => {
		onClose();
		if (opener.current instanceof HTMLElement && opener.current.isConnected)
			opener.current.focus();
	}, [onClose]);
	useEffect(() => {
		const closeOnEscape = (event: KeyboardEvent): void => {
			if (
				event.key !== "Escape" ||
				event.defaultPrevented ||
				insideOwnEscapeLayer(event.target)
			)
				return;
			close();
		};
		document.addEventListener("keydown", closeOnEscape);
		return (): void => {
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [close]);
	return (
		<aside
			aria-labelledby={titleId}
			id={id}
			// Beside the grid it keeps to the grid's height and stays in view: its header stays, its list scrolls.
			className={joinClassNames(
				"flex w-full shrink-0 flex-col lg:sticky lg:top-4 lg:max-h-[min(100%,calc(100dvh-2rem))] lg:w-96",
				className
			)}
		>
			<div className="flex min-h-0 flex-col divide-y divide-neutral-400 overflow-hidden rounded-lg border border-neutral-400">
				<div className="flex min-h-14 shrink-0 items-center justify-between gap-2 px-4 py-2">
					<div className="flex min-w-0 flex-col">
						<h2
							ref={heading}
							className="font-bold text-neutral-900 outline-none"
							id={titleId}
							tabIndex={-1}
						>
							{title}
						</h2>
						{summary}
					</div>
					<Button
						aria-label={t("scheduling.detail.closePanel", { title })}
						variant="icon"
						onClick={close}
					>
						<CloseIcon />
					</Button>
				</div>
				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
					<FocusSidePanelHeading value={focusHeading}>
						{sections
							.filter(hasSomething)
							.map(({ key, title: sectionTitle, items = [], content }) => (
								<section key={key} className="text-sm">
									{sectionTitle && (
										<h3 className="mb-2 font-semibold text-neutral-800">
											{sectionTitle}
										</h3>
									)}
									{items.length > 0 && (
										<ul
											className={
												items.some((item) => item.title)
													? "flex flex-col divide-y divide-neutral-300"
													: "flex flex-col gap-1"
											}
										>
											{items.map((item) => (
												<li
													key={item.key}
													className={
														item.title ? "py-3 first:pt-0 last:pb-0" : undefined
													}
												>
													{item.title && (
														<p className="font-semibold text-neutral-900">
															{item.title}
															{item.tag && (
																<Badge
																	compact
																	className="ml-2"
																	tone={item.tag.tone}
																>
																	{item.tag.label}
																</Badge>
															)}
														</p>
													)}
													{item.lines.map((line, index) => (
														<p key={line} className={lineTone(index)}>
															{line}
														</p>
													))}
													{item.action && (
														<Button
															className="mt-2"
															size="sm"
															variant="secondary"
															onClick={item.action.onClick}
														>
															{item.action.label}
														</Button>
													)}
												</li>
											))}
										</ul>
									)}
									{content}
								</section>
							))}
					</FocusSidePanelHeading>
				</div>
			</div>
		</aside>
	);
};
