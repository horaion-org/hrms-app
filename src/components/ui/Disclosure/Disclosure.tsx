import {
	Disclosure as HeadlessDisclosure,
	DisclosureButton,
	DisclosurePanel,
} from "@headlessui/react";
import type { ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { ChevronDownIcon } from "@/components/ui/Icon";

/** How the fold is drawn; see `DisclosureProps.variant`. */
export type DisclosureVariant = "card" | "inline";

export type DisclosureProps = {
	/** The button's words, such as "More options". */
	title: ReactNode;
	/** What opening shows. */
	children: ReactNode;
	/** Starts open, e.g. when something inside already differs from its default. */
	defaultOpen?: boolean;
	/**
	 * `card` (the default) draws a bordered box; `inline` is a link-like
	 * button with its panel straight below, for a fold inside a row that
	 * already has its own border.
	 */
	variant?: DisclosureVariant;
	className?: string;
};

const variantClasses: Record<
	DisclosureVariant,
	{ box: string; button: string; panel: string }
> = {
	card: {
		box: "rounded-lg border border-neutral-400 bg-white",
		button:
			"w-full justify-between rounded-lg px-4 py-3 text-sm font-semibold text-neutral-900",
		panel: "gap-6 border-t border-neutral-300 p-4",
	},
	inline: {
		box: "",
		button: "rounded-sm text-sm font-semibold text-ink-blue-700",
		panel: "mt-3 gap-3",
	},
};

/** A titled section that opens and closes in place, for options most people leave as they are. */
export const Disclosure = ({
	title,
	children,
	defaultOpen = false,
	variant = "card",
	className,
}: DisclosureProps): FunctionComponent => (
	<HeadlessDisclosure
		as="div"
		className={joinClassNames(variantClasses[variant].box, className)}
		defaultOpen={defaultOpen}
	>
		<DisclosureButton
			className={joinClassNames(
				"group flex cursor-pointer items-center gap-3 text-left outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-ink-blue-500",
				variantClasses[variant].button
			)}
		>
			{title}
			<ChevronDownIcon className="size-4 shrink-0 group-data-open:rotate-180" />
		</DisclosureButton>
		<DisclosurePanel
			className={joinClassNames("flex flex-col", variantClasses[variant].panel)}
		>
			{children}
		</DisclosurePanel>
	</HeadlessDisclosure>
);
