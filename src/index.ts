import { Hono } from "hono";
import { cors } from "hono/cors";
import boards from "./boards";
import login from "./login";
import signup from "./signup";
import tasks from "./tasks";
import user from "./user";
import workspaces from "./workspaces";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

app.route("/login", login);
app.route("/signup", signup);
app.route("/user", user);
app.route("/tasks", tasks);
app.route("/boards", boards);
app.route("/workspaces", workspaces);

app.use(
	"*",
	cors({
		origin: ["*", "https://vue-workers-bib.pages.dev", "41.228.12.170"],
	}),
);
export default app;
