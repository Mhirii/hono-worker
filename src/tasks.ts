import { createClient } from "@supabase/supabase-js";
import { env } from "hono/adapter";

import { Hono } from "hono";

const app = new Hono();

type request_body = {
	id: string;
	board: number;
	title: string;
};

app.get("/", (c) => c.text("Hello Hono!"));
app.post("/", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	const body: request_body = await c.req.json();

	const { data: board_data, error: board_error } = await supabase
		.from("boards")
		.select()
		.eq("id", body.board);
	console.log(board_data);
	if (board_error) {
		return handle_error(board_error);
	}

	const { data, error } = await supabase
		.from("tasks")
		.insert({
			title: body.title,
			board: body.board,
		})
		.select();
	if (error) {
		return handle_error(error);
	}

	const { data: update_data, error: update_error } = await supabase
		.from("boards")
		.update({
			tasks: board_data[0].tasks.push(data[0].id),
		});
	if (update_error) {
		return handle_error(update_error);
	}

	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
});

// biome-ignore lint/suspicious/noExplicitAny: <explanation> //TODO: remove explicit any
const handle_error = (error: any) => {
	console.log(error);
	return new Response(JSON.stringify(error), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
};

export default app;
