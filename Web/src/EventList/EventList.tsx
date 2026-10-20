import {
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Flex,
  Popconfirm,
  Space,
  Table,
  Typography,
  type TableColumnsType,
} from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { config } from "../config.ts";
import { hasRealmRole } from "../roles.ts";
import { EventModal } from "./EventModal.tsx";

export type Event = {
  id: number;
  name: string;
  description: string | null;
  venue: string;
  date: number;
  capacity: number;
  version: number;
};

type EventPage = { items: Event[]; next: number };

const pageSize = 10;

export function EventList() {
  const auth = useAuth();
  const accessToken = auth.user?.access_token;
  const isAdmin = hasRealmRole(accessToken, "ADMIN");
  const [cursors, setCursors] = useState<number[]>([0]);
  const [page, setPage] = useState<EventPage>();
  const [error, setError] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Event>();
  const [reload, setReload] = useState(0);
  const after = cursors.at(-1)!;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      limit: String(pageSize),
      after: String(after),
    });
    fetch(`${config.apiUrl}/events?${query}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load events (${response.status})`);
        }
        return response.json() as Promise<EventPage>;
      })
      .then((data) => {
        setPage(data);
        setError(undefined);
      })
      .catch((reason: Error) => {
        if (reason.name !== "AbortError") {
          setError(reason.message);
        }
      });
    return () => controller.abort();
  }, [accessToken, after, reload]);

  const hasNext = page?.items.length === pageSize;

  const remove = async (event: Event) => {
    const response = await fetch(`${config.apiUrl}/events/${event.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      setError(`Failed to delete event (${response.status})`);
      return;
    }
    setReload(reload + 1);
  };

  const columns: TableColumnsType<Event> = [
    { title: "Name", dataIndex: "name" },
    {
      title: "Date",
      dataIndex: "date",
      render: (date: number) => new Date(date).toLocaleString(),
    },
    { title: "Venue", dataIndex: "venue" },
    { title: "Capacity", dataIndex: "capacity", align: "right" },
    { title: "Description", dataIndex: "description" },
    ...(isAdmin
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (_: unknown, event: Event) => (
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setEditing(event)}
                >
                  Edit
                </Button>
                <Popconfirm
                  title="Delete this event?"
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove(event)}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      title="Events"
      extra={
        isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAdding(true)}
          >
            Add Event
          </Button>
        )
      }
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {error && <Alert type="error" title={error} showIcon />}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={page?.items}
          loading={!page && !error}
          pagination={false}
          locale={{ emptyText: "No events found." }}
        />
        <Flex justify="end" align="center" gap="small">
          <Button
            icon={<LeftOutlined />}
            disabled={cursors.length === 1}
            onClick={() => setCursors(cursors.slice(0, -1))}
          >
            Previous
          </Button>
          <Typography.Text>Page {cursors.length}</Typography.Text>
          <Button
            disabled={!hasNext}
            onClick={() => setCursors([...cursors, page!.next])}
          >
            Next <RightOutlined />
          </Button>
        </Flex>
      </Space>
      <EventModal
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          setCursors([0]);
          setReload(reload + 1);
        }}
      />
      <EventModal
        key={editing?.id}
        open={!!editing}
        event={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          setReload(reload + 1);
        }}
      />
    </Card>
  );
}
