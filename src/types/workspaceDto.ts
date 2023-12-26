export type workspaceDto = {
	id: number;
	title: string;
	owned_by: number;
	boards: number[] | null
	collaborators?: number[];
	invited_users?: number[];
	isSharable: boolean;
	created_at?: Date;
};
