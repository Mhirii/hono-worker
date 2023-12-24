import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { env } from "hono/adapter";
import { AuthDto } from "./types/authDto";

import { Hono } from "hono";
import { getSupabaseClient, handle_error, headers } from "./utils";

const app = new Hono();

// for local usage will clean up later
// TODO: cleanup
interface userDto {
	id: string;
	email: string;
}

app.post("/", async (c) => {
	const supabase = getSupabaseClient(c);
	const body: AuthDto = await c.req.json();

	const { data, error } = await supabase.auth.signUp({
		email: body.email,
		password: body.password,
	});

	if (error)
		return new Response(JSON.stringify(error), {
			headers: headers,
		});

	try {
		if (data.user?.id && data.user.email) {
			const user = {
				id: data.user.id,
				email: data.user.email,
			};
			if (await generateDefaults(supabase, user)) {
				return new Response(JSON.stringify(data), {
					headers: headers,
				});
			}
		} else {
			return new Response(JSON.stringify(new Error("Something went Wrong")), {
				headers: headers,
			});
		}
	} catch (e) {
		return new Response(JSON.stringify(e), {
			headers: headers,
		});
	}
});

//! Throws Errors
//TODO: Cleanup
/**
 * Generates default data for a user in a Supabase database.
 *
 * @param supabase - The Supabase client used to interact with the Supabase database.
 * @param user - An object containing the user's id and email.
 * @returns returns `true` If successful, `Error` object If any error occurs.
 */
const generateDefaults = async (supabase: SupabaseClient, user: userDto) => {
	// create user
	const { data: userData, error: userError } = await supabase
		.from("users")
		.insert({
			created_at: new Date(),
			last_login: new Date(),
			uuid: user.id,
			email: user.email,
		})
		.select();
	if (userError) {
		handle_error(userError);
	}
	if (!userData) {
		return new Error("Error creating user");
	}

	// create default workspace
	const { data: workspaceData, error: workspaceError } = await supabase
		.from("workspaces")
		.insert({
			created_at: new Date(),
			title: "inbox",
			owned_by: user.id,
			isSharable: false,
		})
		.select();
	if (workspaceError) {
		handle_error(workspaceError);
	}
	if (!workspaceData) {
		return new Error("Error generating default user workspace");
	}

	// update user
	const inbox = workspaceData[0];
	const { data: updatedUserData, error: updatedUserError } = await supabase
		.from("users")
		.update({
			Inbox: inbox,
		});

	// create default boards
	const { data: boardData, error: boardError } = await supabase
		.from("boards")
		.insert([
			{
				created_at: new Date(),
				title: "To Do",
				workspace: inbox.id,
			},
			{
				created_at: new Date(),
				title: "In Progress",
				workspace: inbox.id,
			},
			{
				created_at: new Date(),
				title: "Done",
				workspace: inbox.id,
			},
		])
		.select();
	if (boardError) {
		handle_error(boardError);
	}
	if (!boardData) {
		return new Error("Error creating default boards");
	}

	// generate tasks
	const boardIds = boardData.map((board) => board.id);
	const { data: taskData, error: taskError } = await supabase
		.from("tasks")
		.insert([
			{
				created_at: new Date(),
				title: "Welcome to your new workspace!",
				board: boardIds[0],
			},
			{
				created_at: new Date(),
				title: "Planned Task",
				board: boardIds[0],
			},
			{
				created_at: new Date(),
				title: "In the making",
				board: boardIds[1],
			},
			{
				created_at: new Date(),
				title: "This one is done!",
				board: boardIds[2],
			},
			{
				created_at: new Date(),
				title: "Have a Good Time!",
				board: boardIds[2],
			},
		])
		.select();
	if (taskError) {
		handle_error(taskError);
	}
	if (!taskData) {
		return new Error("Error creating default tasks");
	}

	// add default tasks to the boards
	try {
		await supabase
			.from("boards")
			.update({
				tasks: [taskData[0].id, taskData[1].id],
			})
			.eq("id", boardData[0].id);

		await supabase
			.from("boards")
			.update({
				tasks: [taskData[2].id],
			})
			.eq("id", boardData[1].id);

		await supabase
			.from("boards")
			.update({
				tasks: [taskData[3].id, taskData[4].id],
			})
			.eq("id", boardData[2].id);
	} catch (error) {
		console.log(error);
		return new Error("Error adding default tasks to boards");
	}

	return true;
};

export default app;
