/**
 * Whether `value` is one of `list`, narrowing it to the list's members: the
 * type guard a `(LIST as ReadonlyArray<string>).includes(value)` cast stands in for.
 */
export const isOneOf = <T extends string>(
	list: ReadonlyArray<T>,
	value: string
): value is T => list.some((item) => item === value);
