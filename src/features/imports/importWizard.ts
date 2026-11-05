/** The four steps both import pages walk through, in order. */
export const IMPORT_STEPS = ["template", "upload", "check", "import"] as const;

export const TEMPLATE_STEP = 0;
export const UPLOAD_STEP = 1;
export const CHECK_STEP = 2;
export const IMPORT_STEP = 3;

/**
 * Where an import page keeps its copy. Both imports word their template and
 * upload steps under the same keys beneath it.
 */
export type ImportTextPrefix = "people.importPage" | "organisation.import";
