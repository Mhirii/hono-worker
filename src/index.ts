import { createClient } from "@supabase/supabase-js";
import { Context, Hono } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import { AuthDto } from "./types/authDto";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

app.post("/login", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	const body: AuthDto = await c.req.json();

	const { data, error } = await supabase.auth.signInWithPassword({
		email: body.email,
		password: body.password,
	});

	if (error) {
		return new Response(JSON.stringify(error), {
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
});

app.post("/signup", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	const body: AuthDto = await c.req.json();

	const { data, error } = await supabase.auth.signUp({
		email: body.email,
		password: body.password,
	});

	if (error) throw error;

	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
		},
	});
});

app.use(
	"/api3/*",
	cors({
		origin: ["*"],
	}),
);
export default app;
