/** The API path every company-scoped request starts from. */
export const companyPath = (companyId: string): string =>
	`/api/v1/companies/${encodeURIComponent(companyId)}`;
