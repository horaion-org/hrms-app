import {
	useLayoutEffect,
	useCallback,
	type RefCallback,
	useRef,
	type ComponentPropsWithRef,
	type RefObject,
} from "react";
import type { FunctionComponent } from "@/common/types";
import { positionPanel } from "@/components/forms/Combobox/ComboboxPanel/positionPanel";

export type ComboboxPanelProps = ComponentPropsWithRef<"div"> & {
	trigger?: RefObject<HTMLButtonElement | null>;
};

/** Search and footer sit outside the inner listbox. Headless UI owns portal, focus and dismissal.
 * Its built-in anchor targets the input, which lives INSIDE this panel, so anchor to our trigger instead.
 */
export const ComboboxPanel = ({
	trigger,
	ref,
	style,
	...props
}: ComboboxPanelProps): FunctionComponent => {
	const panel = useRef<HTMLDivElement>(null);
	const setPanel: RefCallback<HTMLDivElement> = useCallback(
		(element: HTMLDivElement | null) => {
			panel.current = element;
			if (typeof ref === "function") return ref(element);
			if (ref) ref.current = element;
		},
		[ref]
	);
	useLayoutEffect(() => {
		const element = panel.current;
		const button = trigger?.current;
		if (!element || !button) return;
		const view = button.ownerDocument.defaultView;
		if (!view) return;
		const update = (): void => {
			const next = positionPanel(
				button.getBoundingClientRect(),
				element.scrollHeight + element.offsetHeight - element.clientHeight,
				view.innerWidth,
				view.innerHeight
			);
			Object.assign(element.style, {
				left: `${next.left}px`,
				top: `${next.top}px`,
				width: `${next.width}px`,
				maxHeight: `${next.maxHeight}px`,
			});
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(button);
		observer.observe(element);
		view.addEventListener("resize", update);
		view.addEventListener("scroll", update, true);
		return (): void => {
			observer.disconnect();
			view.removeEventListener("resize", update);
			view.removeEventListener("scroll", update, true);
		};
	}, [trigger]);
	return (
		<div
			{...props}
			ref={setPanel}
			aria-label={undefined}
			aria-labelledby={undefined}
			aria-multiselectable={undefined}
			role="presentation"
			style={{ ...style, position: "fixed", zIndex: 60 }}
		/>
	);
};
