import { PrismaClient } from "@prisma/client";
// import * as COS from "cos-nodejs-sdk-v5";
const COS = require("cos-nodejs-sdk-v5");
import { Hono } from "hono";
import { z } from "zod";

// declare bun environtment interface
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID!,
  SecretKey: process.env.COS_SECRET_KEY!,
});

const cosParams = {
  Region: process.env.REGION!,
  Bucket: process.env.BUCKET!,
};

const app = new Hono();
const prisma = new PrismaClient();
const img_prefix = process.env.IMG_PREFIX!;

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

const text_msg = z.object({
  type: z.literal("text"),
  data: z.object({ text: z.string() }),
});

const image_msg = z.object({
  type: z.literal("image"),
  data: z.object({ url: z.string(), file: z.string() }),
});

const json_msg = z.object({
  type: z.literal("json"),
  data: z.object({ data: z.string() }),
});

const group_notice_json = z.object({
  meta: z.object({
    announce: z.object({
      title: z.string().base64(),
      text: z.string().base64(),
    }),
  }),
});

const single_msg = z.object({
  type: z.string(),
  data: z.unknown(),
});

const msg_pack = z.object({
  sender_name: z.string(),
  source_group_name: z.string(),
  recv_time: z.coerce.date(),
  messages: z.array(single_msg),
});

const transload_img = async (filename: string, url: string) => {
  const buf = await (await fetch(url)).arrayBuffer();
  const res = await cos.putObject({
    ...cosParams,
    Key: `imc_imgs/${filename}`,
    Body: new Buffer(buf),
  });
  return res.statusCode;
};

const base64_decode = (str: string) => {
  return Buffer.from(str, "base64").toString("utf-8");
};

const parse_msg = async (msg: z.infer<typeof single_msg>) => {
  const text_res = text_msg.safeParse(msg);
  if (text_res.success) {
    return `<p>${text_res.data.data.text}</p>`;
  }
  const img_res = image_msg.safeParse(msg);
  if (img_res.success) {
    try {
      const upload_res = await transload_img(img_res.data.data.file, img_res.data.data.url);
      if (!upload_res) return `<p> 本处图片加载失败，上传状态码 ${upload_res}. 内容 ${img_res.data}</p>`;
      return `<img src="${img_prefix}imc_imgs/${img_res.data.data.file}" />`;
    } catch (e) {
      console.error(e);
      return `<p> 本处图片加载失败，异常 ${e}. 内容 ${img_res.data}</p>`;
    }
  }
  const json_res = json_msg.safeParse(msg);
  if (json_res.success) {
    const notice = group_notice_json.safeParse(json_res.data.data.data);
    if (!notice.success) {
      return `<p> 本处json解析失败，内容 ${json_res.data}</p>`;
    }
    const title = base64_decode(notice.data.meta.announce.title);
    const text = base64_decode(notice.data.meta.announce.text);
    return `<p>群公告：${title}</p><p>${text}</p>`;
  }
};

app.post("/qqmsg", async (c) => {
  const body = msg_pack.parse(await c.req.json());
  console.log("received", body);
  const res = await prisma.message.create({
    data: {
      source_type: "QQ",
      ...{
        ...body,
        messages: undefined,
      },
      content: (await Promise.all(body.messages.map(parse_msg))).join(""),
      processed: false,
    },
  });
  console.log("saved", res);
  return c.json(res);
});

export default {
  port: 3212,
  fetch: app.fetch,
};
