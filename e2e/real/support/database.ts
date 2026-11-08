import { execFileSync } from "node:child_process";

import { DATABASE, POSTGRES_CONTAINER, POSTGRES_USER } from "./environment";

/**
 * Reads (and, for the seed's identity swap, writes) the isolated e2e database through `psql` in the Postgres
 * container. Never pointed at the dev database: the name comes from E2E_DATABASE and the swap refuses "horaion".
 */
export function queryRows(sql: string): Record<string, string>[] {
	const output = execFileSync(
		"docker",
		["exec", "-i", POSTGRES_CONTAINER, "psql", "-U", POSTGRES_USER, "-d", DATABASE, "-v", "ON_ERROR_STOP=1", "-A", "-F", "\t", "-P", "footer=off", "-c", sql],
		{ encoding: "utf8" }
	);
	const [header, ...lines] = output.trim().split("\n");
	if (!header) return [];
	const columns = header.split("\t");
	return lines.filter(Boolean).map((line) => Object.fromEntries(line.split("\t").map((value, index) => [columns[index], value])));
}

export function execute(sql: string): void {
	if (DATABASE === "horaion") throw new Error("refusing to write to the dev database");
	execFileSync("docker", ["exec", "-i", POSTGRES_CONTAINER, "psql", "-U", POSTGRES_USER, "-d", DATABASE, "-v", "ON_ERROR_STOP=1", "-q", "-c", sql]);
}

/** Single-quoted SQL literal. Only ever used with values the seed itself generated. */
export function literal(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}
