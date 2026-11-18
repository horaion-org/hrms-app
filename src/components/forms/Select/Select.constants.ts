export type SelectOption = {
	value: string;
	label: string;
	disabled?: boolean;
	/**
	 * The heading this option sits under. Consecutive options with the same
	 * group are listed together beneath it; options without one get no heading.
	 * With wholeGroups the group is a chip that chooses the whole group, and
	 * each option's row names its group instead.
	 */
	group?: string;
	/** A muted second line under the label that tells options with the same label apart, e.g. a person's Department. */
	description?: string;
};
