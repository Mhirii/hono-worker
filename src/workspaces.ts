import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { workspaceDto } from "./types/workspaceDto";
import { getSupabaseClient, handle_error, headers } from "./utils";

const app = new Hono();

/* ──────────────────────── creates a new workspace ──────────────────────── */
app.post("/", async (c) => {
	const supabase = getSupabaseClient(c);
	const body = await c.req.json();

	const { data, error } = await supabase
		.from("workspaces")
		.insert({
			title: body.title,
			owned_by: body.id,
			isSharable: true,
			boards: []
		})
		.select();

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

/* ───────────── Retrieves workspaces owned by a specific user ───────────── */
app.get("/user/:id", async (c) => {
	const supabase = getSupabaseClient(c);

	const user_id = c.req.param("id");
	const { data, error } = await supabase
		.from("workspaces")
		.select()
		.eq("owned_by", user_id);

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

/* ────────────────── Retrieves a workspace by id ───────────────── */
app.get("/:id", async (c) => {
	const supabase = getSupabaseClient(c);

	const { data, error } = await supabase
		.from("workspaces")
		.select()
		.eq("id", c.req.param("id"));

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

/* ──────── Retrieves boards associated with the specified workspace ─────── */
app.get("/boards/:workspace_id", async (c) => {
	const supabase = getSupabaseClient(c);

	const { data, error } = await supabase
		.from("boards")
		.select()
		.eq("workspace", c.req.param("workspace_id"));

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

// TODO: Retrieve shared workspaces

/* ─────────────────────────── Deletes a workspace ────────────────────────── */
app.delete("/:id", async (c) => {
	const supabase = getSupabaseClient(c);

	const { data, error } = await supabase
		.from("workspaces")
		.delete()
		.eq("id", c.req.param("id"))
		.select();

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

/**
 * Creates a new workspace in the Supabase database.
 *
 * @param {SupabaseClient} supabase - The Supabase client object.
 * @param {string} title - The title of the workspace.
 * @param {number} user_id - The ID of the user who owns the workspace.
 * @param {boolean} isSharable - Indicates whether the workspace is sharable.
 * @return {Promise<{ workspace: workspaceDto | undefined; error: PostgrestError | undefined }>} - A promise that resolves to an object containing the created workspace and any potential error.
 */
export const createWorkspace = async (supabase: SupabaseClient, title: string, user_id: number, isSharable: boolean): Promise<{ workspace: workspaceDto | undefined; error: PostgrestError | undefined }> => {
	const { data, error } = await supabase
		.from("workspaces")
		.insert({
			title: title,
			owned_by: user_id,
			isSharable: isSharable
		})
		.select()
	if (error) {
		console.log(error)
		return { workspace: undefined, error }
	}
	const workspace: workspaceDto = data[0]
	return { workspace, error: undefined }
}

/**
 * Retrieves a workspace by its ID.
 *
 * @param {SupabaseClient} supabase - The Supabase client.
 * @param {number} workspace_id - The ID of the workspace to retrieve.
 * @return {Promise<{ workspace: workspaceDto | undefined; error: PostgrestError | unknown | undefined }>} - A promise that resolves to an object containing the retrieved workspace and any potential error.
 */
const getWorkspaceById = async (supabase: SupabaseClient, workspace_id: number): Promise<{ workspace: workspaceDto | undefined; error: PostgrestError | unknown | undefined }> => {
	try {
		const { data, error } = await supabase
			.from("workspaces")
			.select()
			.eq("id", workspace_id)
		if (error) {
			console.log(error)
			return { workspace: undefined, error }
		}
		return { workspace: data[0], error: undefined };
	} catch (error) {
		console.error('Unexpected error:', error);
		return { workspace: undefined, error };
	}
}


/**
 * Adds a board to a workspace.
 *
 * @param {SupabaseClient} supabase - The Supabase client.
 * @param {number} workspace_id - The ID of the workspace.
 * @param {number} board_id - The ID of the board to be added.
 * @return {Promise<{ workspace: workspaceDto | undefined; error: PostgrestError | unknown | undefined }>} - A promise that resolves to an object containing the updated workspace and any error that occurred.
 */
export const addBoardToWorkspace = async (supabase: SupabaseClient, workspace_id: number, board_id: number): Promise<{ workspace: workspaceDto | undefined; error: PostgrestError | unknown | undefined }> => {
	try {
		const { workspace, error: workspaceError } = await getWorkspaceById(supabase, workspace_id)
		if (workspaceError) {
			return { workspace: undefined, error: workspaceError }
		}
		if (workspace) {
			const boards = workspace.boards
			const updatedBoards = boards ? boards.concat(board_id) : [board_id];
			const { data, error } = await supabase
				.from("workspaces")
				.update({
					boards: updatedBoards
				})
				.eq("id", workspace_id)
				.select()
			if (error) {
				return { workspace: undefined, error }
			}
			return { workspace: data[0], error: undefined };
		} return { workspace: undefined, error: Error("workspace does not exist") }
	} catch (error) {
		console.error('Unexpected error:', error);
		return { workspace: undefined, error };
	}
}

export default app;
