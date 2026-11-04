import { createFileRoute, retainSearchParams } from "@tanstack/react-router";
import { parseBranchContext } from "@/features/workspace/unitSearch";
import { MainLayout } from "@/pages/MainLayout";

/**
 * Every signed-in page. The Branch the person chose on one list (`branch`
 * in the URL) is carried to every link and navigation that does not set
 * its own, so it follows them across pages and survives a reload. Only the
 * Branch: a Department belongs to the page it was chosen on.
 */
export const Route = createFileRoute("/_authenticated/_app")({
	validateSearch: parseBranchContext,
	search: { middlewares: [retainSearchParams(["branch"])] },
	component: MainLayout,
});
