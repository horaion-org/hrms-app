import { TabList as HeadlessTabList } from "@headlessui/react";
import {
	useEffect,
	useImperativeHandle,
	useRef,
	type ComponentPropsWithRef,
} from "react";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";

export type TabListProps = ComponentPropsWithRef<"div"> &
	(
		| { "aria-label": string; "aria-labelledby"?: string }
		| { "aria-label"?: string; "aria-labelledby": string }
	);

export const TabList = ({
	ref,
	className,
	...props
}: TabListProps): FunctionComponent => {
	const listRef = useRef<HTMLDivElement>(null);
	useImperativeHandle(ref, () => listRef.current!, []);

	useEffect(() => {
		const list = listRef.current;
		if (!list) return;

		const revealSelectedTab = (): void => {
			const selected = [
				...list.querySelectorAll<HTMLElement>(
					'[role="tab"][aria-selected="true"]'
				),
			].find((tab) => tab.closest('[role="tablist"]') === list);
			if (!selected) return;

			const tabBounds = selected.getBoundingClientRect();
			const styles = getComputedStyle(list);
			// Keep the existing outside focus outline inside the scrollport.
			const viewportLeft = list.getBoundingClientRect().left + list.clientLeft;
			const left = viewportLeft + (Number.parseFloat(styles.paddingLeft) || 0);
			const right =
				viewportLeft +
				list.clientWidth -
				(Number.parseFloat(styles.paddingRight) || 0);
			// A label wider than the viewport cannot fit; leave it alone if it
			// already spans the viewport, otherwise reveal its nearest edge.
			let delta = 0;
			if (tabBounds.left < left && tabBounds.right < right) {
				delta = tabBounds.left - left;
			} else if (tabBounds.right > right && tabBounds.left > left) {
				delta =
					tabBounds.width > right - left
						? tabBounds.left - left
						: tabBounds.right - right;
			}
			if (delta !== 0) {
				// Never use scrollIntoView: it can scroll the page/ancestors too.
				list.scrollTo({ left: list.scrollLeft + delta, behavior: "instant" });
			}
		};

		// Headless UI owns selection, including future controlled parent updates.
		const observer = new MutationObserver((records) => {
			if (
				records.some(
					({ target }) =>
						target instanceof Element &&
						target.closest('[role="tablist"]') === list
				)
			) {
				revealSelectedTab();
			}
		});
		observer.observe(list, {
			attributes: true,
			attributeFilter: ["aria-selected"],
			childList: true,
			subtree: true,
		});
		revealSelectedTab();
		return (): void => {
			observer.disconnect();
		};
	}, []);

	return (
		<HeadlessTabList
			ref={listRef}
			className={joinClassNames(
				"flex min-w-0 max-w-full flex-nowrap gap-6 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
				className
			)}
			{...props}
		/>
	);
};
