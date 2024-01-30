"use client";

const base = "http://127.0.0.1:3001";

type Source = "qq" | "wechat" | "lark" | undefined;

export async function getGroups(type: Source) {
  // fetch get
  const res = await fetch(
    `${base}/groups?${new URLSearchParams(
      type
        ? {
            source_type: type.toUpperCase(),
          }
        : undefined,
    )}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  const data = (await res.json()) as string[];
  return data;
}

export async function getMessages(
  type: Source,
  filterNotRead: boolean,
  filterDate: Date | undefined,
  filterGroupName: "all" | Iterable<string | number>,
  pageParam: string,
) {
  console.log("getting messages");
  console.log("filterGroupName", filterGroupName);
  const res = await fetch(`${base}/messages`, {
    method: "POST",
    body: JSON.stringify({
      where: {
        source_type: type?.toUpperCase(),
        processed: filterNotRead ? false : undefined,
        source_group_name:
          filterGroupName === "all"
            ? undefined
            : {
                in: Array.from(filterGroupName),
              },
      },
      cursor:
        pageParam !== ""
          ? {
              id: pageParam,
            }
          : undefined,
      skip: pageParam !== "" ? 1 : 0,
      take: 20,
      orderBy: [
        {
          recv_time: "desc",
        },
        {
          id: "desc",
        },
      ],
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  console.log("data reached");
  return { data: data, nextCursor: data[data.length - 1]?.id };
}

export async function setProcessed({
  id,
  processed,
}: {
  id: string;
  processed: boolean;
}) {
  const res = await fetch(`${base}/processed`, {
    method: "PUT",
    body: JSON.stringify({
      id,
      processed,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return res.status === 204;
}
