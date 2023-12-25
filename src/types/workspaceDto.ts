export type workspaceDto = {
	id: number;
	title: string;
	owned_by: number;
	boards: number[] | null
	collaborators?: string[];
	invited_users?: string[];
	isSharable: boolean;
	created_at?: Date;
};
