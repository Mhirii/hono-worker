import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { addTaskToBoard } from "./boards";
import { isAuthorizedDto } from "./types/authorization";
import { boardDto } from "./types/boardDto";
import { createTaskDto, taskDto } from "./types/taskDto";
import { getSupabaseClient, handle_error, headers, workspaceAuthorization } from "./utils";
import { getWorkspaceById } from "./workspaces";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

/* ─────────────────────────── Creates a new task ─────────────────────────── */
app.post("/", async (c) => {
	const supabase = getSupabaseClient(c);
	const body: createTaskDto = await c.req.json();

	const { isAuthorized, authorizationError } = await workspaceAuthorization(supabase, body.user_id, body.workspace_id);
	if (authorizationError) {
		return new Response(JSON.stringify({ error: authorizationError.message }), {
			headers: headers,
		})
	}
	if (!isAuthorized) {
		return new Response(JSON.stringify({ error: Error("Not authorized") }), {
			headers: headers,
		})
	}
	const { task, board, error } = await createTask(supabase, body.title, body.board_id);
	if (error) {
		return new Response(JSON.stringify(error), {
			headers: headers,
		})
	}
	return new Response(JSON.stringify({ task, board }), {
		headers: headers,
	});

});

/* ───────── Retrieves all tasks associated with the specified board ──────── */
app.get("/board/:id", async (c) => {
	const supabase = getSupabaseClient(c);

	const board_id = c.req.param("id");
	const { data, error } = await supabase
		.from("boards")
		.select()
		.eq("id", board_id);

	if (error) {
		return handle_error(error);
	}

	const tasks = [];
	const task_ids: number[] = data[0].tasks;
	for (const task_id of task_ids) {
		const task_data = await getTaskById(task_id, supabase);
		tasks.push(task_data);
	}
	return new Response(JSON.stringify(tasks), {
		headers: headers,
	});
});

/**
 * Retrieves a task from the database by its ID.
 *
 * @param {number} id - The ID of the task to retrieve.
 * @return {Promise<object>} - A Promise that resolves to the task data if successful, or rejects with an error if not.
 */
export const getTaskById = async (
	id: number,
	supabase: SupabaseClient
): Promise<object> => {
	const { data, error } = await supabase.from("tasks").select().eq("id", id);
	if (error) {
		return handle_error(error);
	}
	return data;
};

/**
 * Creates a task and adds it to the specified board.
 *
 * @param {SupabaseClient} supabase - The Supabase client.
 * @param {string} title - The title of the task.
 * @param {number} board_id - The ID of the board to add the task to.
 * @return {Promise<{ task: taskDto | undefined; board: boardDto | undefined; error: PostgrestError | unknown | undefined }>} - A promise that resolves to an object containing the created task, the board it was added to, and any error that occurred.
 */
export const createTask = async (supabase: SupabaseClient, title: string, board_id: number): Promise<{ task: taskDto | undefined; board: boardDto | undefined; error: PostgrestError | unknown | undefined }> => {
	// Insert the new task into the "tasks" table
	const { data, error } = await supabase
		.from("tasks")
		.insert({
			title: title,
			board: board_id
		})
		.select()
	if (error) {
		console.log(error)
		return { task: undefined, board: undefined, error }
	}
	const task: taskDto = data[0]

	//add the task to its board
	const { board, error: boardError } = await addTaskToBoard(supabase, task.id, board_id)
	if (boardError) {
		console.log(boardError)
		return { task: undefined, board: undefined, error: boardError }
	}
	if (board) {
		return {
			task,
			board,
			error: undefined
		}
	}
	return { task: undefined, board: undefined, error: Error("board or task does not exist") }
}

const createTaskAuthorization = async (supabase: SupabaseClient, user_id: number, workspace_id: number): Promise<isAuthorizedDto> => {
	const { workspace, error } = await getWorkspaceById(supabase, workspace_id)
	if (error) {
		return { isAuthorized: false, authorizationError: Error(`Error occurred while trying to find workspace with id ${workspace_id}`) }
	}
	if (!workspace) {
		return { isAuthorized: false, authorizationError: Error(`could not find workspace with id ${workspace_id}`) }
	}
	if (workspace.owned_by === user_id) {
		return { isAuthorized: true, authorizationError: null }
	}
	if (workspace.isSharable && workspace.collaborators && workspace.collaborators.includes(user_id)) {
		return { isAuthorized: true, authorizationError: null }
	}
	return { isAuthorized: false, authorizationError: null }
}


export default app;
