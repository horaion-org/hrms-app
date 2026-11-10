import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	constraintOptionsSchema,
	departmentConstraintSchema,
	type ConstraintBody,
	type ConstraintOptions,
	type DepartmentConstraint,
	type PolicyLock,
} from "@/features/scheduling/constraints/api";
import { SCHEDULING_QUERY_ROOT } from "@/features/scheduling/paths";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The company's Scheduling policy (ADR-0058): constraints set once for every
 * department, each locked (departments may only make it stricter) or a
 * default (ticked on new drafts, may be left out). Read under
 * `scheduling_policy:read` and changed under `scheduling_policy:update`, both
 * held company-wide; a constraint here has the shape of a Department's, with
 * no Department. Only types that link to nothing can be set: the policy's own
 * `constraint-options` lists them.
 */

/** What adding or replacing a company constraint sends: a constraint body and its lock. */
export type PolicyConstraintBody = ConstraintBody & { lock: PolicyLock };

/** The company's Scheduling policy routes. */
export const schedulingPolicyPath = (companyId: string): string =>
	`${companyPath(companyId)}/scheduling-policy`;

const policyConstraintsPath = (companyId: string): string =>
	`${schedulingPolicyPath(companyId)}/constraints`;

const policyConstraintPath = (
	companyId: string,
	constraintId: string
): string =>
	`${policyConstraintsPath(companyId)}/${encodeURIComponent(constraintId)}`;

const policyConstraintsSchema = z.array(departmentConstraintSchema);

/** The company's constraints, active and inactive, by name. */
export const fetchPolicyConstraints = (
	companyId: string,
	signal?: AbortSignal
): Promise<Array<DepartmentConstraint>> =>
	apiRequest(policyConstraintsPath(companyId), policyConstraintsSchema, {
		signal,
	});

/** Adds a company constraint; it reaches every department's drafts. */
export const createPolicyConstraint = (
	companyId: string,
	body: PolicyConstraintBody
): Promise<DepartmentConstraint> =>
	apiRequest(policyConstraintsPath(companyId), departmentConstraintSchema, {
		method: "POST",
		body,
	});

/** Replaces a company constraint, its lock included. */
export const updatePolicyConstraint = (
	companyId: string,
	constraintId: string,
	body: PolicyConstraintBody
): Promise<DepartmentConstraint> =>
	apiRequest(
		policyConstraintPath(companyId, constraintId),
		departmentConstraintSchema,
		{ method: "PUT", body }
	);

/** Removes a company constraint; generated schedules keep their copies. */
export const deletePolicyConstraint = (
	companyId: string,
	constraintId: string
): Promise<void> =>
	apiRequestVoid(policyConstraintPath(companyId, constraintId), {
		method: "DELETE",
	});

/** The types a company may set, with their fields; no link choices. */
export const fetchPolicyOptions = (
	companyId: string,
	signal?: AbortSignal
): Promise<ConstraintOptions> =>
	apiRequest(
		`${schedulingPolicyPath(companyId)}/constraint-options`,
		constraintOptionsSchema,
		{ signal }
	);

/** Every Scheduling policy query sits under the company's scheduling root, so a change reloads the Departments' lists. */
export const policyKey = (
	companyId: string,
	part: "constraints" | "constraint-options"
): readonly ["scheduling", string, "policy", string] =>
	[SCHEDULING_QUERY_ROOT, companyId, "policy", part] as const;

/** The company's constraints; `allowed` false asks for nothing. */
export const policyConstraintsQuery = (
	companyId: string,
	allowed = true
): QueryOptionsFor<Array<DepartmentConstraint>, ReturnType<typeof policyKey>> =>
	queryOptions({
		queryKey: policyKey(companyId, "constraints"),
		queryFn: allowed
			? ({ signal }): Promise<Array<DepartmentConstraint>> =>
					fetchPolicyConstraints(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** What the policy's dialog offers; `allowed` false asks for nothing. */
export const policyOptionsQuery = (
	companyId: string,
	allowed = true
): QueryOptionsFor<ConstraintOptions, ReturnType<typeof policyKey>> =>
	queryOptions({
		queryKey: policyKey(companyId, "constraint-options"),
		queryFn: allowed
			? ({ signal }): Promise<ConstraintOptions> =>
					fetchPolicyOptions(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 300_000,
		retry,
	});
