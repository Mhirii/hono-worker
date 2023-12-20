import { createClient } from "@supabase/supabase-js";
import { env } from "hono/adapter";

import { Hono } from "hono";

const app = new Hono();

app.post("/", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
});

app.get("/", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
	const body = await c.req.json();
	const {
		data: { user },
	} = await supabase.auth.getUser(body.access_token);

	return new Response(JSON.stringify(user), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
});

export default app;
