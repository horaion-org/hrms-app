export type SelectOption = {
	value: string;
	label: string;
	disabled?: boolean;
	/**
	 * The heading this option sits under. Consecutive options with the same
	 * group are listed together beneath it; options without one get no heading.
	 */
	group?: string;
};
