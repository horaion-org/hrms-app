/** A chosen shift as the warning reads it: its name and the job titles it lists. */
type ListedShift = { name: string; jobTitleIds: ReadonlyArray<string> };

/**
 * The chosen shifts that list none of the counted job titles, by name: on
 * those, no one could ever be counted. A shift whose job titles are unknown
 * (an API that predates them sends none) is never named, so the warning is
 * never false.
 */
export const shiftsMissingTitles = (
	shifts: ReadonlyArray<ListedShift>,
	countedJobTitleIds: ReadonlyArray<string>
): Array<string> =>
	countedJobTitleIds.length === 0
		? []
		: shifts
				.filter(
					(shift) =>
						shift.jobTitleIds.length > 0 &&
						!shift.jobTitleIds.some((id) => countedJobTitleIds.includes(id))
				)
				.map((shift) => shift.name);
