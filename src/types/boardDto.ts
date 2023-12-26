import { workspaceDto } from "./workspaceDto";

export type Board = {
	title: string;
	description?: string;
	tasks: number[];
};

export type boardDto = Board & { id: number; workspace: number };

export type createBoardDto = {
	title: string;
	workspace_id: number;
	user_id: number;
}

export type createBoardResponse = {
	board: boardDto,
	workspace: workspaceDto
}