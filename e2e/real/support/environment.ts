import { readFileSync } from "node:fs";

/**
 * Where the real end-to-end run finds its stack, accounts and output folders. Every value comes from the
 * environment so the same specs run against any isolated stack. The run folder holds the accounts file, the seed
 * output, browser states and screenshots; it defaults to the git-ignored `test-results/e2e-real`.
 */
export const RUN_DIRECTORY = process.env["E2E_RUN_DIR"] ?? "test-results/e2e-real";

export const APP_URL = process.env["E2E_APP_URL"] ?? "http://localhost:5190";
export const SCREENS_DIRECTORY = process.env["E2E_SCREENS_DIR"] ?? `${RUN_DIRECTORY}/screens`;
export const SEED_FILE = process.env["E2E_SEED_FILE"] ?? `${RUN_DIRECTORY}/run/seed.json`;
export const STORAGE_DIRECTORY = process.env["E2E_STORAGE_DIR"] ?? `${RUN_DIRECTORY}/run/storage`;
export const CREATED_IDENTITIES_FILE =
	process.env["E2E_CREATED_IDENTITIES_FILE"] ?? `${RUN_DIRECTORY}/run/cognito-created.txt`;
export const POSTGRES_CONTAINER = process.env["E2E_POSTGRES_CONTAINER"] ?? "horaion-postgres";
export const POSTGRES_USER = process.env["E2E_POSTGRES_USER"] ?? "vernon";
export const DATABASE = process.env["E2E_DATABASE"] ?? "horaion_e2e";
/** What 76-approvals-ui saw of the approval gaps, for 77-approvals-gaps to judge. */
export const APPROVALS_SEEN_FILE = `${RUN_DIRECTORY}/run/approvals-seen.json`;

/**
 * The user types the run signs in as. ownerB owns the second company (data isolation); the others belong to the
 * first. manager is Operations' manager, manager2 Support's; editor edits Operations' roster without leave keys;
 * hr holds the company's leave and terms keys; approver decides Operations' publications; worker has no role.
 */
export type Role = "admin" | "manager" | "manager2" | "editor" | "hr" | "approver" | "worker" | "ownerB";
export const ROLES: Role[] = ["admin", "manager", "manager2", "editor", "hr", "approver", "worker", "ownerB"];
export const COMPANY_A_ROLES: Role[] = ["admin", "manager", "manager2", "editor", "hr", "approver", "worker"];

/** A value the accounts file must hold; a missing one stops the run with its name rather than signing in as "". */
function requiredValue(values: Record<string, string>, name: string): string {
	const value = values[name];
	if (!value) throw new Error(`${name} is missing from the accounts file`);
	return value;
}

/** The pre-made accounts (`run/accounts.env`): one shared password, one email per role. */
export function readAccounts(): { password: string; emails: Record<Role, string> } {
	const file = process.env["E2E_ACCOUNTS_FILE"] ?? `${RUN_DIRECTORY}/run/accounts.env`;
	const values: Record<string, string> = Object.fromEntries(
		readFileSync(file, "utf8")
			.split("\n")
			.filter((line) => line.includes("="))
			.map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
	);
	return {
		password: requiredValue(values, "E2E_PASSWORD"),
		emails: {
			admin: requiredValue(values, "E2E_ADMIN_EMAIL"),
			manager: requiredValue(values, "E2E_MANAGER_EMAIL"),
			manager2: requiredValue(values, "E2E_MANAGER2_EMAIL"),
			editor: requiredValue(values, "E2E_EDITOR_EMAIL"),
			hr: requiredValue(values, "E2E_HR_EMAIL"),
			approver: requiredValue(values, "E2E_APPROVER_EMAIL"),
			worker: requiredValue(values, "E2E_WORKER_EMAIL"),
			ownerB: requiredValue(values, "E2E_OWNERB_EMAIL"),
		},
	};
}
