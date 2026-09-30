import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Register } from "@/pages/Register";
export const Route = createFileRoute("/register")({
	validateSearch: z.object({ module: z.string().optional().catch(undefined) }),
	component: Register,
});
