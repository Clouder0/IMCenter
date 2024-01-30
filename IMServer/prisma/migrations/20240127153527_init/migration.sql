-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('QQ', 'WECHAT', 'LARK');

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "source_group_name" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "recv_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
