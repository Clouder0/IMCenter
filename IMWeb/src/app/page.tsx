"use client";

import { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Listbox,
  ListboxItem,
  Select,
  SelectItem,
  Selection,
  Spacer,
  Switch,
  colors,
} from "@nextui-org/react";
import { MdDateRange, MdOutlineFileDownload } from "react-icons/md";
import { FaSearch } from "react-icons/fa";
import React, { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "react-query";
import { getGroups, getMessages, setProcessed } from "./lib/data";
import parse from "html-react-parser";
import { BsCheckLg } from "react-icons/bs";
import { RxCross2 } from "react-icons/rx";
import { GiConsoleController } from "react-icons/gi";
import { IoMdRefresh } from "react-icons/io";

type Key = string | number;
type Source = "qq" | "wechat" | "lark" | undefined;
function SideBar({
  source,
  filterGroup,
  onSelectionChange,
}: {
  source: Source;
  filterGroup: "all" | Iterable<Key>;
  onSelectionChange: (keys: Selection) => any;
}) {
  const { isLoading, isError, data, error } = useQuery(["groups", source], () =>
    getGroups(source),
  );
  if (isLoading)
    return (
      <Listbox color="primary">
        <ListboxItem key={"loading"}>loading...</ListboxItem>
      </Listbox>
    );
  if (isError)
    return (
      <Listbox color="primary">
        <ListboxItem key={"error"}>
          error {(error as any).toString()}
        </ListboxItem>
      </Listbox>
    );
  return (
    <Listbox
      color="primary"
      selectionMode="multiple"
      selectedKeys={filterGroup}
      onSelectionChange={onSelectionChange}
    >
      {data!.map((group) => (
        <ListboxItem key={group}>{group}</ListboxItem>
      ))}
    </Listbox>
  );
}

function ProcessedButton({
  id,
  processed,
  source,
  filterNotRead,
  filterDate,
  filterGroup,
}: {
  id: string;
  processed: boolean;
  source: Source;
  filterNotRead: boolean;
  filterDate?: Date;
  filterGroup: Iterable<Key>;
}) {
  const queryClient = useQueryClient();
  const keys = ["messages", source, filterNotRead, filterDate, filterGroup];
  const mutation = useMutation({
    mutationFn: setProcessed,
    // When mutate is called:
    onMutate: async ({ id, processed }) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: keys });

      // Snapshot the previous value
      const previous = queryClient.getQueryData(keys);

      // Optimistically update to the new value
      queryClient.setQueryData(keys, (old: any) => {
        const updated = {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((msg: any) =>
              msg.id === id ? { ...msg, processed: !msg.processed } : msg,
            ),
          })),
        };
        return updated;
      });

      // Return a context object with the snapshotted value
      return { previous };
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (err, { id, processed }, context) => {
      queryClient.setQueryData(keys, context?.previous);
    },
    // Always refetch after error or success:
    onSettled: () => {
      // queryClient.invalidateQueries({ queryKey: keys })
    },
  });
  const clickFunc = () => mutation.mutate({ id, processed: !processed });
  if (processed) {
    return (
      <Button isIconOnly radius="full" color="success" size="sm">
        <BsCheckLg size={28} color={colors.white} onClick={clickFunc} />
      </Button>
    );
  } else {
    return (
      <Button isIconOnly radius="full" color="warning" size="sm">
        <RxCross2 size={28} color={colors.white} onClick={clickFunc} />
      </Button>
    );
  }
}

function MsgCard({
  source,
  filterNotRead,
  filterDate,
  filterGroup,
  message,
}: {
  source: Source;
  filterNotRead: boolean;
  filterDate?: Date;
  filterGroup: "all" | Iterable<Key>;
  message: any;
}) {
  return (
    <Card className="item m-5 w-4/5 ml-auto mr-auto">
      <CardHeader className="flex flex-row items-center justify-start">
        <Chip color="primary" size="md">
          {message.source_group_name}
        </Chip>
        <Spacer x={2} />
        <Chip color="secondary" size="sm">
          {new Date(message.recv_time).toLocaleString()}
        </Chip>
        <Spacer className="grow" />
        <ProcessedButton
          id={message.id}
          processed={message.processed}
          source={source}
          filterNotRead={filterNotRead}
          filterDate={filterDate}
          filterGroup={filterGroup}
        />
      </CardHeader>
      <CardBody className="ml-3 mb-3 mt-1 p-1">
        {parse(message.content)}
      </CardBody>
    </Card>
  );
}

function MessageList({
  source,
  filterNotRead,
  filterDate,
  filterGroup,
}: {
  source: Source;
  filterNotRead: boolean;
  filterDate?: Date;
  filterGroup: "all" | Iterable<Key>;
}) {
  const keys = ["messages", source, filterNotRead, filterDate, filterGroup];
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    isError,
  } = useInfiniteQuery(
    keys,
    ({ pageParam = "" }) =>
      getMessages(source, filterNotRead, filterDate, filterGroup, pageParam),
    {
      getNextPageParam: (lastPage, pages) => lastPage.nextCursor,
    },
  );
  const listRef = React.useRef<HTMLDivElement>(null);

  if (!isFetchingNextPage && isFetching)
    return (
      <div className="overflow-y-scroll w-full bg-default-50">
        <p>loading...</p>
      </div>
    );
  if (isError) return <p>error {(error as any).toString()}</p>;
  return (
    <div
      ref={listRef}
      className="overflow-y-scroll w-full bg-default-50"
      onScroll={(e) => {
        // check if scroll to bottom
        const t = e.currentTarget;
        const bottom =
          Math.abs(t.scrollHeight - (t.scrollTop + t.clientHeight)) <= 20;
        if (bottom && !isFetching && hasNextPage) {
          console.log("try fetch");
          fetchNextPage().then((e) => {
            console.log("fetch done");
            // listRef.current?.scrollTo(0, listRef.current.scrollHeight)
          });
        }
      }}
    >
      {data!.pages.map((page) =>
        page.data.map((message: any) => {
          return (
            <MsgCard
              key={message.id ?? "msgid"}
              data-grid-groupkey={page.nextCursor ?? "nocursor"}
              source={source}
              filterNotRead={filterNotRead}
              filterDate={filterDate}
              filterGroup={filterGroup}
              message={message}
            ></MsgCard>
          );
        }),
      )}
    </div>
  );
}

function InnerApp() {
  const [source, setSource] = useState<Source>("qq");
  const [filterNotRead, setFilterNotRead] = useState<boolean>(false);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterGroupRaw, setFilterGroupRaw] = useState<"all" | Iterable<Key>>(
    "all",
  );
  const [filterGroup, setFilterGroup] = useState<"all" | Array<Key>>("all");
  const queryClient = useQueryClient();
  return (
    <CardBody className="flex flex-row p-0">
      <div className="w-96 bg-primary-100 flex flex-col">
        <Select
          isRequired
          selectionMode="single"
          color="primary"
          variant="flat"
          radius="none"
          label="消息来源"
          defaultSelectedKeys={["qq"]}
          onSelectionChange={(key: any) => {
            setSource(key.size == 0 ? undefined : (key.currentKey as Source));
          }}
        >
          <SelectItem
            color="primary"
            value="qq"
            key="qq"
            className="text-foreground"
          >
            QQ
          </SelectItem>
          <SelectItem
            color="primary"
            value="wechat"
            key="wechat"
            className="text-foreground"
          >
            微信
          </SelectItem>
          <SelectItem
            color="primary"
            value="lark"
            key="lark"
            className="text-foreground"
          >
            飞书
          </SelectItem>
        </Select>
        <SideBar
          source={source}
          filterGroup={filterGroupRaw}
          onSelectionChange={(keys) => {
            setFilterGroupRaw(keys);
            setFilterGroup(
              keys === "all" ? "all" : Array.from(keys).toSorted(),
            );
          }}
        />
      </div>
      <Divider orientation="vertical" className="w-0.5" />
      <MessageList
        source={source}
        filterNotRead={filterNotRead}
        filterDate={filterDate}
        filterGroup={filterGroup}
      />
      <Card className="absolute bottom-2 left-2 w-64 h-14 bg-primary-300 flex p-0">
        <CardBody className="flex flex-row place-content-around gap-2">
          <Button isIconOnly color="primary" aria-label="Date" size="sm">
            <MdDateRange />
          </Button>
          <Button isIconOnly color="primary" aria-label="Search" size="sm">
            <FaSearch />
          </Button>
          <Switch
            defaultSelected
            size="sm"
            isSelected={filterNotRead}
            onValueChange={(v) => setFilterNotRead(v)}
          >
            只看未读
          </Switch>
        </CardBody>
      </Card>
      <Button
        className="absolute right-12 bottom-8"
        isIconOnly
        color="primary"
        radius="full"
        onClick={() => {
          queryClient.invalidateQueries([
            "messages",
            source,
            filterNotRead,
            filterDate,
            filterGroup,
          ]);
        }}
      >
        <IoMdRefresh size={30} />
      </Button>
    </CardBody>
  );
}

export default function App() {
  return (
    <div className="light w-screen h-screen flex justify-center items-center bg-background">
      <Card className="w-4/5 h-4/5 bg-primary-300 mx-auto">
        <CardHeader>
          <p className="mx-auto text-foreground text-large font-extrabold">
            IM Center
          </p>
        </CardHeader>
        <Divider />
        <InnerApp />
      </Card>
    </div>
  );
}
