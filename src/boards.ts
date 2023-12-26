import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { get_task_by_id } from "./tasks";
import { boardDto } from "./types/boardDto";
import { workspaceDto } from "./types/workspaceDto";
import { getSupabaseClient, handle_error, headers } from "./utils";
import { addBoardToWorkspace } from "./workspaces";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

/* ─────────────────────────── creates a new board ────────────────────────── */
app.post("/", async (c) => {
	const supabase = getSupabaseClient(c);
	const body = await c.req.json();

	const { data, error } = await supabase.from("boards").insert({
		title: body.title,
		owned_by: body.id,
		isSharable: true,
	});

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
});

/* ───────────────────── Retrieves workspaces by its id ───────────────────── */
app.get("/:id", async (c) => {
	const supabase = getSupabaseClient(c);
	const id = c.req.param("id");

	const { data, error } = await supabase.from("boards").select().eq("id", id);

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

/* ─────────── Retrieves tasks associated with the specified board ────────── */
app.get("/tasks/:board_id", async (c) => {
	const supabase = getSupabaseClient(c);
	const id = c.req.param("board_id");

	const { data: board_data, error: board_error } = await supabase
		.from("boards")
		.select()
		.eq("id", id);
	if (board_error) {
		return handle_error(board_error);
	}

	const board: boardDto = board_data[0];
	const tasks_IDs = board.tasks;
	const tasks = [];

	for (const id of tasks_IDs) {
		const task_data = await get_task_by_id(id, c);
		tasks.push(task_data);
	}

	return new Response(JSON.stringify(tasks), {
		headers: headers,
	});
});

/* ───────────────────────────── Deletes a board ──────────────────────────── */
app.delete("/:id", async (c) => {
	const supabase = getSupabaseClient(c);
	const id = c.req.param("id");

	const { data, error } = await supabase
		.from("boards")
		.delete()
		.eq("id", id)
		.select();

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

/**
 * Create a new board with the given title in the specified workspace.
 *
 * @param {SupabaseClient} supabase - The Supabase client instance.
 * @param {string} title - The title of the board.
 * @param {number} workspace_id - The ID of the workspace where the board will be created.
 * @return {Promise<{ board: boardDto | undefined; workspace: workspaceDto | undefined; error: PostgrestError | unknown | undefined }>} - A promise that resolves to an object containing the created board, workspace, and error (if any).
 */
export const createBoard = async (supabase: SupabaseClient, title: string, workspace_id: number): Promise<{ board: boardDto | undefined; workspace: workspaceDto | undefined; error: PostgrestError | unknown | undefined }> => {
	// create the board
	const { data, error } = await supabase
		.from("boards")
		.insert({
			title: title,
			workspace: workspace_id
		})
		.select();
	if (error) {
		console.log(error);
		return { board: undefined, workspace: undefined, error };
	}
	const board: boardDto = data[0]

	// add the board to its workspace
	const { workspace, error: workspaceError } = await addBoardToWorkspace(supabase, workspace_id, board.id);
	if (workspaceError) {
		console.log(workspaceError);
		return { board: undefined, workspace: undefined, error: workspaceError };
	}
	if (workspace) {
		return { board, workspace, error: undefined };
	}
	return { board: undefined, workspace: undefined, error: Error("workspace does not exist") };
};


/**
 * Retrieves a board from the database by its ID.
 *
 * @param {SupabaseClient} supabase - The Supabase client used to connect to the database.
 * @param {number} board_id - The ID of the board to retrieve.
 * @return {Promise<{ board: boardDto | undefined; error: PostgrestError | unknown | undefined }>} - A promise that resolves to an object containing the retrieved board and any potential error.
 */
export const getBoardById = async (supabase: SupabaseClient, board_id: number): Promise<{ board: boardDto | undefined; error: PostgrestError | unknown | undefined }> => {
	const { data, error } = await supabase
		.from("boards")
		.select()
		.eq("id", board_id)
	if (error) {
		return { board: undefined, error }
	}
	const board: boardDto = data[0]
	return { board, error: undefined };
}

/**
 * Adds a task to a board.
 *
 * @param {SupabaseClient} supabase - The Supabase client.
 * @param {number} task_id - The ID of the task to be added.
 * @param {number} board_id - The ID of the board where the task will be added.
 * @return {Promise<{ board: boardDto | undefined; error: PostgrestError | unknown | undefined }>} - A promise that resolves to an object with the updated board and any error that occurred.
 */
export const addTaskToBoard = async (supabase: SupabaseClient, task_id: number, board_id: number): Promise<{ board: boardDto | undefined; error: PostgrestError | unknown | undefined }> => {
	const { board, error } = await getBoardById(supabase, board_id)
	if (error) {
		return { board: undefined, error }
	}
	if (board) {
		const tasks = board.tasks ? board.tasks.concat(task_id) : [task_id];
		const { data, error } = await supabase
			.from("boards")
			.update({
				tasks: tasks
			})
			.eq("id", board_id)
			.select()
		if (error) {
			return { board: undefined, error }
		}
		const updatedBoard: boardDto = data[0]
		return { board: updatedBoard, error: undefined };
	}
	return { board: undefined, error: Error("board does not exist") }
}

export default app;
