import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { getTaskById } from "./tasks";
import { boardDto, createBoardDto, createBoardResponse } from "./types/boardDto";
import { workspaceDto } from "./types/workspaceDto";
import { getSupabaseClient, handle_error, headers, workspaceAuthorization } from "./utils";
import { addBoardToWorkspace } from "./workspaces";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

/* ─────────────────────────── creates a new board ────────────────────────── */
app.post("/", async (c) => {
	const supabase = getSupabaseClient(c);
	const body: createBoardDto = await c.req.json();

	const { isAuthorized, authorizationError } = await workspaceAuthorization(supabase, body.user_id, body.workspace_id)
	if (authorizationError || !isAuthorized) {
		return new Response(JSON.stringify({ error: authorizationError ? authorizationError?.message : "Not Authorized" }), {
			headers: headers,
		})
	}

	const { board, workspace, error } = await createBoard(supabase, body.title, body.workspace_id);
	if (error) {
		return new Response(JSON.stringify({ error }), {
			headers: headers,
		})
	}
	if (!board || !workspace) {
		return new Response(JSON.stringify({ error: Error("Error creating board") }), {
			headers: headers,
		})
	}
	const response: createBoardResponse = {
		board: board,
		workspace: workspace
	}

	return new Response(JSON.stringify(response), {
		headers: headers,
	});
});

/* ───────────────────── Get board its id ───────────────────── */
app.get("/:board_id", async (c) => {
	const supabase = getSupabaseClient(c);
	const board_id: number = parseInt(c.req.param("board_id"));
	const { board, error } = await getBoardById(supabase, board_id)

	return new Response(JSON.stringify(error ? error.message : (board ? board : "Could not Find board")), {
		headers: headers,
	});
});

/* ─────────── Retrieves tasks associated with the specified board ────────── */
app.get("/:board_id/tasks", async (c) => {
	const supabase = getSupabaseClient(c);
	const board_id: number = parseInt(c.req.param("board_id"));
	const { board, error } = await getBoardById(supabase, board_id);

	if (error || !board) {
		return new Response(JSON.stringify(error ? error.message : "Could not find board"), {
			headers: headers,
		});
	}

	const tasks_ids = board.tasks;
	const tasks = [];

	for (const id of tasks_ids) {
		const task_data = await getTaskById(id, supabase);
		tasks.push(task_data);
	}

	return new Response(JSON.stringify(tasks), {
		headers: headers,
	});
});

/* ───────────────────────────── Deletes a board ──────────────────────────── */
app.delete("/:board_id", async (c) => {
	const supabase = getSupabaseClient(c);
	const board_id: number = parseInt(c.req.param("board_id"));

	const { data, error } = await supabase
		.from("boards")
		.delete()
		.eq("id", board_id)
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
export const getBoardById = async (supabase: SupabaseClient, board_id: number): Promise<{ board: boardDto | undefined; error: PostgrestError | Error | null }> => {
	const { data, error } = await supabase
		.from("boards")
		.select()
		.eq("id", board_id)
	if (error) {
		return { board: undefined, error }
	}
	const board: boardDto = data[0]
	return { board, error: null };
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
