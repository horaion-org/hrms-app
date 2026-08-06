import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";
import {
	WorkspaceContext,
	type Workspace,
} from "@/features/session/workspace-context";

type WorkspaceProviderProps = {
	value: Workspace;
	children: ReactNode;
};

export const WorkspaceProvider = ({
	value,
	children,
}: WorkspaceProviderProps): FunctionComponent => {
	return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
};
