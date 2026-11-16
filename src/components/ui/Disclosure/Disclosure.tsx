import {
	Disclosure as HeadlessDisclosure,
	DisclosureButton,
	DisclosurePanel,
} from "@headlessui/react";
import type { ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { ChevronDownIcon } from "@/components/ui/Icon";

export type DisclosureProps = {
	/** The button's words, such as "More options". */
	title: ReactNode;
	/** What opening shows. */
	children: ReactNode;
	/** Starts open, e.g. when something inside already differs from its default. */
	defaultOpen?: boolean;
	className?: string;
};

/** A titled section that opens and closes in place, for options most people leave as they are. */
export const Disclosure = ({
	title,
	children,
	defaultOpen = false,
	className,
}: DisclosureProps): FunctionComponent => (
	<HeadlessDisclosure
		as="div"
		defaultOpen={defaultOpen}
		className={joinClassNames(
			"rounded-lg border border-neutral-400 bg-white",
			className
		)}
	>
		<DisclosureButton className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-neutral-900 outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-ink-blue-500">
			{title}
			<ChevronDownIcon className="size-4 shrink-0 group-data-open:rotate-180" />
		</DisclosureButton>
		<DisclosurePanel className="flex flex-col gap-6 border-t border-neutral-300 p-4">
			{children}
		</DisclosurePanel>
	</HeadlessDisclosure>
);
