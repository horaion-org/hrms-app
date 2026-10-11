import { createFileRoute } from "@tanstack/react-router";
import { RecentActivity } from "@/pages/RecentActivity";

export const Route = createFileRoute("/_authenticated/_app/activity")({
	validateSearch: (search: Record<string, unknown>): { page?: number } => {
		const page = Number(search["page"]);
		return Number.isInteger(page) && page > 1 ? { page } : {};
	},
	component: RecentActivity,
});
