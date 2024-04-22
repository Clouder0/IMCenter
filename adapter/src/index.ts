import { Hono } from "hono";
import { z } from "zod";

// declare bun environtment interface

const app = new Hono();
const qq_url = process.env.QQ_URL ?? "http://127.0.0.1:3000";
const backend_url = process.env.BACKEND_URL;
const filters = process.env.FILTER?.split(",") ?? [""];

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

const group_res = z.object({
  group_id: z.coerce.string(),
  group_name: z.string(),
});

const get_group_info = async (group_id: string) => {
  const res = await fetch(`${qq_url}/get_group_info?${new URLSearchParams({ group_id }).toString()}`);
  const res_json = await res.json();
  return group_res.parse(res_json.data);
};

const single_msg = z.object({
  type: z.string(),
  data: z.unknown(),
});

const msg_pack = z.object({
  time: z.number().int(),
  sender: z.object({
    nickname: z.string(),
  }),
  message: z.array(single_msg),
  group_id: z.coerce.string().optional(),
});

app.post("/qqmsg", async (c) => {
  const body = await c.req.json();
  const msg = msg_pack.parse(body);
  if (!msg.group_id) return c.text("not group message");
  const group = await get_group_info(msg.group_id);
  const in_list = filters.some((name) => group.group_name.includes(name));
  if (!in_list) return c.text("not in filter group list");
  const res = await fetch(backend_url!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender_name: msg.sender.nickname,
      source_group_name: group.group_name,
      recv_time: new Date(),
      messages: msg.message,
    }),
  });
  return c.json(await res.json());
});

export default {
  port: 3212,
  fetch: app.fetch,
};
