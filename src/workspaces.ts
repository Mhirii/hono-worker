import { createClient } from "@supabase/supabase-js";
import { env } from "hono/adapter";

import { Hono } from "hono";

const app = new Hono();

app.post("/", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	const body = await c.req.json();

	const { data, error } = await supabase.from("workspaces").insert({
		title: body.title,
		owned_by: body.id,
	});

	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
});

export default app;
