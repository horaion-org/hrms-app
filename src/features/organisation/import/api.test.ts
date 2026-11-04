import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { UnexpectedResponseError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	checkOrganisationFile,
	startOrganisationImport,
} from "@/features/organisation/import/api";
import {
	checkFixture,
	organisationImportFixture,
} from "@/features/organisation/import/fixtures";

const IMPORTS = "/api/v1/companies/c-1/organisation-imports";

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

const file = new File(["xlsx"], "structure.xlsx");

describe("organisation import client", () => {
	it("posts the file to the checks route and reads the check, sheet by sheet", async () => {
		const calls = stubApi({
			[`POST ${IMPORTS}/checks`]: {
				status: 200,
				body: envelope(checkFixture()),
			},
		});

		const check = await checkOrganisationFile("c-1", file);

		expect(check.toCreate).toEqual({
			branches: 1,
			departments: 1,
			jobTitles: 1,
		});
		expect(check.headedByYou).toEqual({ branches: 1, departments: 1 });
		expect(check.rows.map((row) => row.sheet)).toEqual([
			"BRANCHES",
			"DEPARTMENTS",
			"JOB_TITLES",
		]);
		expect(calls[0]).toMatchObject({
			method: "POST",
			path: `${IMPORTS}/checks`,
		});
	});

	it("refuses a check naming a sheet the app does not know", async () => {
		const unknownSheet = checkFixture();
		stubApi({
			[`POST ${IMPORTS}/checks`]: {
				status: 200,
				body: envelope({
					...unknownSheet,
					rows: [{ ...unknownSheet.rows[0], sheet: "EMPLOYEES" }],
				}),
			},
		});

		await expect(checkOrganisationFile("c-1", file)).rejects.toBeInstanceOf(
			UnexpectedResponseError
		);
	});

	it("reads the synchronous result of an import with its row outcomes", async () => {
		stubApi({
			[`POST ${IMPORTS}`]: {
				status: 201,
				body: envelope(organisationImportFixture()),
			},
		});

		const finished = await startOrganisationImport("c-1", file);

		expect(finished.created).toEqual({
			branches: 1,
			departments: 1,
			jobTitles: 1,
		});
		expect(finished.rows[0]).toEqual({
			sheet: "BRANCHES",
			rowNumber: 3,
			result: "CREATED",
			unitId: "b-9",
		});
	});
});
