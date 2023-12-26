import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Context, Hono } from "hono";
import { addTaskToBoard } from "./boards";
import { boardDto } from "./types/boardDto";
import { Task, taskDto } from "./types/taskDto";
import { getSupabaseClient, handle_error, headers } from "./utils";

const app = new Hono();

type request_body = {
	id: string;
	board_id: number;
	title: string;
};

app.get("/", (c) => c.text("Hello Hono!"));

/* ─────────────────────────── Creates a new task ─────────────────────────── */
app.post("/", async (c) => {
	const supabase = getSupabaseClient(c);
	const body: request_body = await c.req.json();

	// add the task to the tasks Table
	const { data: task_data, error } = await supabase
		.from("tasks")
		.insert({
			title: body.title,
			board: body.board_id,
		})
		.select();
	if (error) {
		return handle_error(error);
	}

	// add the task to the tasks[] column in boards Table
	const { data: board_data, error: board_error } = await supabase
		.from("boards")
		.select()
		.eq("id", body.board_id);
	if (board_error) {
		return handle_error(board_error);
	}
	const board: boardDto = board_data[0];
	const { data: update_data, error: update_error } = await supabase
		.from("boards")
		.update({
			tasks: board.tasks
				? [...board.tasks, task_data[0].id]
				: [task_data[0].id],
		})
		.eq("id", body.board_id);
	if (update_error) {
		return handle_error(update_error);
	}

	return new Response(JSON.stringify(task_data), {
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
		const task_data = await get_task_by_id(task_id, c);
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
export const get_task_by_id = async (
	id: number,
	c: Context,
): Promise<object> => {
	const supabase = getSupabaseClient(c);
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


export default app;
