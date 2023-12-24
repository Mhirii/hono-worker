import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { Hono } from "hono";
import { get_task_by_id } from "./tasks";
import { boardDto } from "./types/boardDto";
import { getSupabaseClient, handle_error, headers } from "./utils";

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

export default app;
