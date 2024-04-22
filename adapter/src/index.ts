import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/msg", async (c) => {
  const body = await c.req.json();
  return c.json(body);
});

export default {
  port: 3212,
};
