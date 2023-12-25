import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { env } from "hono/adapter";
import { AuthDto } from "./types/authDto";

import { Hono } from "hono";
import boards from "./boards";
import { createUser } from "./user";
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
      const { user: userData, error: userError } = await createUser(supabase, user.id, user.email)
      if (userError) {
        return new Response(JSON.stringify(userError), {
          headers: headers,
        });
      }
      return new Response(JSON.stringify({ data, userData }), {
        headers: headers,
      });
    }
  } catch (e) {
    return new Response(JSON.stringify(e), {
      headers: headers,
    });
  }
});


export default app;
