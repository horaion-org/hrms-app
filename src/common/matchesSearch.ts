/** Whether a name contains the search, ignoring case and outer spaces; an empty search matches all. */
export const matchesSearch = (name: string, search: string): boolean =>
	name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
