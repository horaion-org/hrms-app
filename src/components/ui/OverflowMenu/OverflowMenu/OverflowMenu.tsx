import { Menu, MenuButton, MenuItems } from "@headlessui/react";
import { useCallback, useRef, type ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { MoreVerticalIcon } from "@/components/ui/Icon";

export type OverflowMenuProps = {
	children: ReactNode;
	disabled?: boolean;
	className?: string;
} & (
	| {
			/** A full-width card whose visible label names the menu. */
			variant?: "card";
			label: ReactNode;
	  }
	| {
			/** A compact icon-only trigger, e.g. a table row's "More actions". */
			variant: "icon";
			/** The trigger's accessible name. */
			label: string;
			/** Draws the trigger as a secondary button, for a toolbar of framed buttons (as `FiltersPopover` is). */
			framed?: boolean;
	  }
	| {
			/** A person's avatar as the trigger, e.g. the header's account menu. */
			variant: "avatar";
			/** The trigger's accessible name, e.g. "Account menu". */
			label: string;
			/** Whose initials the avatar shows. */
			name: string;
	  }
);

/** The panel the compact triggers (icon and avatar) open, below and aligned to their end. */
const compactPanelClasses =
	"z-10 w-max divide-y divide-neutral-400 overflow-hidden rounded-lg border border-neutral-400 bg-white shadow-md outline-none [--anchor-gap:4px]";

const IconOverflowMenu = ({
	label,
	children,
	disabled,
	framed,
	className,
}: {
	label: string;
	children: ReactNode;
	disabled?: boolean;
	framed?: boolean;
	className?: string;
}): FunctionComponent => (
	<Menu
		key={disabled ? "disabled" : "enabled"}
		as="div"
		className={joinClassNames("inline-flex", className)}
	>
		<MenuButton
			aria-label={label}
			as={Button}
			className={framed ? "px-3.5" : "data-open:text-ink-blue-700"}
			disabled={disabled}
			variant={framed ? "secondary" : "icon"}
		>
			<MoreVerticalIcon />
		</MenuButton>
		<MenuItems
			anchor="bottom end"
			className={joinClassNames(compactPanelClasses, "min-w-40")}
		>
			{children}
		</MenuItems>
	</Menu>
);

const AvatarOverflowMenu = ({
	label,
	name,
	children,
	disabled,
	className,
}: {
	label: string;
	name: string;
	children: ReactNode;
	disabled?: boolean;
	className?: string;
}): FunctionComponent => (
	<Menu
		key={disabled ? "disabled" : "enabled"}
		as="div"
		className={joinClassNames("inline-flex", className)}
	>
		<MenuButton
			aria-label={label}
			className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
			disabled={disabled}
		>
			<Avatar name={name} />
		</MenuButton>
		<MenuItems
			anchor="bottom end"
			className={joinClassNames(compactPanelClasses, "min-w-48")}
		>
			{children}
		</MenuItems>
	</Menu>
);

const CardOverflowMenu = ({
	label,
	children,
	disabled,
	className,
}: {
	label: ReactNode;
	children: ReactNode;
	disabled?: boolean;
	className?: string;
}): FunctionComponent => {
	const triggerRef = useRef<HTMLButtonElement>(null);
	const stopObservingRef = useRef<(() => void) | null>(null);
	// Headless UI exposes resolved placement on the portalled panel, but not in
	// its render props. Mirror only that attribute so both cards can be styled.
	const panelRef = useCallback((panel: HTMLElement | null): void => {
		stopObservingRef.current?.();
		stopObservingRef.current = null;
		const trigger = triggerRef.current;
		if (!panel || !trigger) return;

		const syncPlacement = (): void => {
			const anchor = panel.getAttribute("data-anchor");
			if (anchor) trigger.setAttribute("data-panel-anchor", anchor);
			else trigger.removeAttribute("data-panel-anchor");
		};
		const observer = new MutationObserver(syncPlacement);
		observer.observe(panel, {
			attributes: true,
			attributeFilter: ["data-anchor"],
		});
		syncPlacement();
		stopObservingRef.current = (): void => {
			observer.disconnect();
			trigger.removeAttribute("data-panel-anchor");
		};
	}, []);

	return (
		// Reset Headless UI's open state when availability changes, including mid-menu.
		<Menu
			key={disabled ? "disabled" : "enabled"}
			as="div"
			className={joinClassNames("w-full", className)}
		>
			<MenuButton
				ref={triggerRef}
				className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-400 bg-white px-4 text-left text-base font-semibold text-neutral-900 data-hover:bg-neutral-100 data-open:rounded-b-none data-open:data-[panel-anchor^=top]:rounded-b-lg data-open:bg-ink-blue-50 data-open:shadow-md data-open:data-hover:bg-ink-blue-50 data-disabled:cursor-not-allowed data-disabled:bg-neutral-200 data-disabled:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
				disabled={disabled}
			>
				<span className="min-w-0 flex-1">{label}</span>
				<MoreVerticalIcon className="size-6 shrink-0" />
			</MenuButton>
			{/* Below: share the header border. Flipped above: two complete cards. */}
			<MenuItems
				ref={panelRef}
				anchor="bottom start"
				className="z-10 w-(--button-width) divide-y divide-neutral-400 overflow-hidden rounded-b-lg border border-t-0 border-neutral-400 bg-white shadow-md outline-none data-[anchor^=top]:rounded-lg data-[anchor^=top]:border-t [--anchor-gap:0px] [--anchor-offset:0px]"
			>
				{children}
			</MenuItems>
		</Menu>
	);
};

export const OverflowMenu = (props: OverflowMenuProps): FunctionComponent => {
	if (props.variant === "icon") return <IconOverflowMenu {...props} />;
	if (props.variant === "avatar") return <AvatarOverflowMenu {...props} />;
	return <CardOverflowMenu {...props} />;
};
