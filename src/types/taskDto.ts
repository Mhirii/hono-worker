
export type Task = {
	title: string;
	description?: string;
	created_at?: Date;
	updated_at?: Date;
}
export type taskDto = Task & { id: number; board: number };