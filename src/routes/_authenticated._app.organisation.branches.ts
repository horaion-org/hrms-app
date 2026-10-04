import { createFileRoute } from "@tanstack/react-router";
import { Branches } from "@/pages/Branches";
export const Route = createFileRoute(
	"/_authenticated/_app/organisation/branches"
)({
	component: Branches,
});
