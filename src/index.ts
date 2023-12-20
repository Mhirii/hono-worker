import { createClient } from "@supabase/supabase-js";
import { Context, Hono } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import login from "./login";
import signup from "./signup";
import { AuthDto } from "./types/authDto";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

app.route("/login", login);
app.route("/signup", signup);

app.use(
	"*",
	cors({
		origin: ["*", "https://vue-workers-bib.pages.dev", "41.228.12.170"],
	}),
);
export default app;
