import type { components } from "@/common/api-types.gen";

type Schemas = components["schemas"];

/**
 * The generated schemas mark every property optional, because springdoc does
 * not emit `required` for Java record components. These aliases narrow the
 * responses to what the API actually always sends, and keep `null` where a
 * column is genuinely nullable.
 */

export type Company = Required<Schemas["CompanyResponse"]>;

export type Membership = Required<Schemas["Membership"]> & {
	company_name: string;
};

/**
 * The envelope every list endpoint returns. Hand-written until the API's
 * OpenAPI specification is regenerated from a running instance; the generated
 * schemas do not describe it yet. Run `npm run gen:api` once the API is up and
 * this can be replaced with the generated shape.
 */
export type Paged<TItem> = {
	content: Array<TItem>;
	page: {
		number: number;
		size: number;
		total_elements: number;
		total_pages: number;
		first: boolean;
		last: boolean;
		has_next: boolean;
		has_previous: boolean;
	};
};

export type Me = Omit<Required<Schemas["MeResponse"]>, "memberships"> & {
	memberships: Array<Membership>;
};

export type Member = Omit<Required<Schemas["MemberResponse"]>, "role_ids"> & {
	role_ids: Array<string>;
};

export type Role = Omit<Required<Schemas["RoleResponse"]>, "permissions"> & {
	permissions: Array<string>;
};

export type RoleAssignment = Required<Schemas["RoleAssignmentResponse"]>;

export type CatalogAction = Required<Schemas["Action"]>;

export type CatalogResource = Omit<Required<Schemas["Resource"]>, "actions"> & {
	actions: Array<CatalogAction>;
};

export type MembershipImport = {
	imported: Array<Required<Schemas["ImportedRow"]>>;
	skipped: Array<Required<Schemas["SkippedRow"]>>;
	failed: Array<Required<Schemas["FailedRow"]>>;
};

export type MembershipStatus = Member["status"];

/** A `resource:action` key from the Permission Catalog. */
export type PermissionKey = string;

export const OWNER_ROLE_NAME = "Company Owner";
