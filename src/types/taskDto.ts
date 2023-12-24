export type taskDto = {
	id: number;
	title: string;
	description?: string;
	created_at: Date;
	updated_at: Date;
	board: number;
};
