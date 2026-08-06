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

export type Me = Omit<
	Required<Schemas["MeResponse"]>,
	"display_name" | "memberships"
> & {
	display_name: string | null;
	memberships: Array<Membership>;
};

export type Member = Omit<
	Required<Schemas["MemberResponse"]>,
	"display_name" | "role_ids"
> & {
	display_name: string | null;
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
