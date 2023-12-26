
export type Task = {
	title: string;
	description?: string;
	created_at?: Date;
	updated_at?: Date;
}
export type taskDto = Task & { id: number; board: number };

export type createTaskDto = {
	title: string;
	board_id: number;
	workspace_id: number;
	user_id: number;
}