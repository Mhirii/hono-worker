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

	if (error)
		return new Response(JSON.stringify(error), {
			headers: {
				"Content-Type": "application/json",
			},
		});

	if (data.user) {
		if (data.user.email) {
			const supabase_data = await insert_user(
				data.user.id,
				data.user.email,
				supabase,
			);
		}
	}
	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
});

//TODO: remove explicit any
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const insert_user = async (email: string, uuid: string, supabase: any) => {
	const { data, error } = await supabase.rpc("insert_user", {
		uuid: uuid,
		email: email,
	});
	if (error) {
		return new Response(JSON.stringify(error), {
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
	return data;
};

app.use(
	"*",
	cors({
		origin: ["*", "https://vue-workers-bib.pages.dev", "41.228.12.170"],
	}),
);
export default app;
