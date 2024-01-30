import { PrismaClient } from "@prisma/client";
import { uploadLocalFile } from "./utils";
import dotenv from "dotenv";
import fastify from "fastify";
import cors from '@fastify/cors'

dotenv.config();

const client = new PrismaClient();

const keywords = process.env.KEYWORDS?.split("|") ?? [];

console.log("Loaded keywords: ", keywords);

const app = fastify({logger: true})

// Declare a route
app.get("/", async function handler(req, res) {
  res.code(200).send({ hello: "world" });
});

app.get("/groups", async function handler(req: any,res) {

  const data = (await client.message.groupBy({
    where: {
      source_type: req.query.source_type
    },
    by: ['source_group_name'],
    _count: {
      source_group_name: true,
    }
  })).map((x) => x.source_group_name)
  console.log(data)
  res.code(200).send(data)
})

type QQMessage = {
  body: {
    allDownloadedPromise: any;
    peer: {
      uid: string;
      name: string;
      chatType: string;
    };
    sender: {
      uid: string;
      memberName: string;
      nickName: string;
    };
    elements: {
      type: string;
      content: string;
      file: any;
      raw: any;
    }[];
    raw: any;
  };
};

app.put("/processed", async function handler(req: any, res) {
  try{
 await client.message.update({
    where: {
      id: req.body.id,
    },
    data: {
      processed: req.body.processed,
    },
  });
  res.code(204).send();
   
  } catch(e) {
    console.error(e)
    res.code(500).send(e)
  }
})

app.post("/messages", async function handler(req: any, res) {
  return await client.message.findMany(req.body);
});

app.post("/qqmessage",async function handler(req, res) {
  const r = req as unknown as QQMessage;
  if (!r.body.peer) return {};
  if (r.body.peer.chatType !== "group") return {};
  // not in keyword group list
  if (!keywords.some((keyword) => r.body.peer.name.includes(keyword)))
    return {};
  const group_name = r.body.peer.name;
  // extract message sender
  const sender_name = r.body.sender.nickName;
  // extract message content
  let message_content = "";
  for (const element of r.body.elements) {
    try {
      if (element.type === "text") {
        message_content += `<p>${element.content}</p>`;
      } else if (element.type === "image") {
        const file_path = element.file as string;
        // upload file to tencent cloud COS
        const get_url = await uploadLocalFile(file_path);
        message_content += `<img src="${get_url}" alt="image">`;
      }
    } catch (e) {
      console.error(e);
    }
  }
  if(message_content === "") return {}
  const saved_msg = await client.message.create({
    data: {
      source_group_name: group_name,
      sender_name: sender_name,
      content: message_content,
      source_type: "QQ",
      processed: false,
    },
  });
  console.log(saved_msg);
  res.code(200).send({});
});

async function main() {
  console.log("Main running...");
  await app.register(cors, { 
    // put your options here
  })
  await client.$connect();
  console.log("Connected to database.");
  await app.listen({ host: "0.0.0.0", port: 3001 });
}

main()
  .then(() => {
    console.log("Started.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

const example = {
  allDownloadedPromise: {},
  peer: { uid: "820752472", name: "HITSZ", chatType: "group" },
  sender: {
    uid: "u_kMhVuwW0FhpCjaWCU8FTtw",
    memberName: "Clouder",
    nickName: "Clouder",
  },
  elements: [
    {
      type: "text",
      content: "1111",
      raw: {
        elementType: 1,
        elementId: "7328823132963674833",
        extBufForUI: "0x",
        textElement: {
          content: "1111",
          atType: 0,
          atUid: "0",
          atTinyId: "0",
          atNtUid: "",
          subElementType: 0,
          atChannelId: "0",
          linkInfo: null,
          atRoleId: "0",
          atRoleColor: 0,
          atRoleName: "",
          needNotify: 0,
        },
        faceElement: null,
        marketFaceElement: null,
        replyElement: null,
        picElement: null,
        pttElement: null,
        videoElement: null,
        grayTipElement: null,
        arkElement: null,
        fileElement: null,
        liveGiftElement: null,
        markdownElement: null,
        structLongMsgElement: null,
        multiForwardMsgElement: null,
        giphyElement: null,
        walletElement: null,
        inlineKeyboardElement: null,
        textGiftElement: null,
        calendarElement: null,
        yoloGameResultElement: null,
        avRecordElement: null,
        structMsgElement: null,
        faceBubbleElement: null,
        shareLocationElement: null,
        tofuRecordElement: null,
        taskTopMsgElement: null,
      },
    },
  ],
  raw: {
    msgId: "7328823132963674834",
    msgRandom: "1511541737",
    msgSeq: "1447",
    cntSeq: "0",
    chatType: 2,
    msgType: 2,
    subMsgType: 1,
    sendType: 2,
    senderUid: "u_kMhVuwW0FhpCjaWCU8FTtw",
    peerUid: "820752472",
    channelId: "",
    guildId: "",
    guildCode: "0",
    fromUid: "0",
    fromAppid: "0",
    msgTime: "1706374608",
    msgMeta: "0x",
    sendStatus: 2,
    sendRemarkName: "",
    sendMemberName: "",
    sendNickName: "Clouder",
    guildName: "",
    channelName: "",
    elements: [
      {
        elementType: 1,
        elementId: "7328823132963674833",
        extBufForUI: "0x",
        textElement: {
          content: "1111",
          atType: 0,
          atUid: "0",
          atTinyId: "0",
          atNtUid: "",
          subElementType: 0,
          atChannelId: "0",
          linkInfo: null,
          atRoleId: "0",
          atRoleColor: 0,
          atRoleName: "",
          needNotify: 0,
        },
        faceElement: null,
        marketFaceElement: null,
        replyElement: null,
        picElement: null,
        pttElement: null,
        videoElement: null,
        grayTipElement: null,
        arkElement: null,
        fileElement: null,
        liveGiftElement: null,
        markdownElement: null,
        structLongMsgElement: null,
        multiForwardMsgElement: null,
        giphyElement: null,
        walletElement: null,
        inlineKeyboardElement: null,
        textGiftElement: null,
        calendarElement: null,
        yoloGameResultElement: null,
        avRecordElement: null,
        structMsgElement: null,
        faceBubbleElement: null,
        shareLocationElement: null,
        tofuRecordElement: null,
        taskTopMsgElement: null,
      },
    ],
    records: [],
    emojiLikesList: [],
    commentCnt: "0",
    directMsgFlag: 0,
    directMsgMembers: [],
    peerName: "HITSZ",
    freqLimitInfo: null,
    editable: true,
    avatarMeta: "",
    avatarPendant: "",
    feedId: "",
    roleId: "0",
    timeStamp: "0",
    clientIdentityInfo: null,
    isImportMsg: false,
    atType: 0,
    roleType: 0,
    fromChannelRoleInfo: { roleId: "0", name: "", color: 0 },
    fromGuildRoleInfo: { roleId: "0", name: "", color: 0 },
    levelRoleInfo: { roleId: "0", name: "", color: 0 },
    recallTime: "0",
    isOnlineMsg: true,
    generalFlags: "0x",
    clientSeq: "0",
    fileGroupSize: null,
    foldingInfo: null,
    multiTransInfo: null,
    senderUin: "2586604022",
    peerUin: "820752472",
    msgAttrs: {},
    anonymousExtInfo: null,
    nameType: 0,
    avatarFlag: 0,
    extInfoForUI: null,
    personalMedal: null,
    categoryManage: 0,
  },
};
