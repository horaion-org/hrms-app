import { useState } from "react";
import {
	rememberClosed,
	rememberedClosed,
} from "@/features/scheduling/departmentSetup/sectionFolds";

/** What a page needs to fold its sections: whether one is open, and the ways to change that. */
export type SectionFolds = {
	isOpen: (section: string) => boolean;
	toggle: (section: string) => void;
	open: (section: string) => void;
	closeAll: (sections: ReadonlyArray<string>) => void;
	openAll: () => void;
};

/**
 * The sections (or groups) a person closed, remembered in this browser under
 * `storageKey` (it holds only section names, no personal data); until they
 * fold one, the sections in `startClosed` start closed.
 */
export const useSectionFolds = (
	storageKey: string,
	startClosed: ReadonlyArray<string>
): SectionFolds => {
	const [remembered, setRemembered] = useState(() =>
		rememberedClosed(storageKey)
	);
	const closed = remembered ?? startClosed;
	const keep = (next: ReadonlyArray<string>): void => {
		rememberClosed(storageKey, next);
		setRemembered([...next]);
	};
	return {
		isOpen: (section): boolean => !closed.includes(section),
		toggle: (section): void => {
			keep(
				closed.includes(section)
					? closed.filter((each) => each !== section)
					: [...closed, section]
			);
		},
		open: (section): void => {
			if (closed.includes(section))
				keep(closed.filter((each) => each !== section));
		},
		closeAll: (sections): void => {
			keep(sections);
		},
		openAll: (): void => {
			keep([]);
		},
	};
};
