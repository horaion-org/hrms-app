import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { AddEmployee } from "@/pages/AddEmployee";

export const Route = createFileRoute("/_authenticated/_app/people_/new")({
	loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery),
	component: AddEmployee,
});
