import {
  DeleteOutlined,
  EditOutlined,
  ShoppingCartOutlined,
  LeftOutlined,
  OrderedListOutlined,
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
import { useNavigate } from "react-router";
import { config } from "../config.ts";
import { errorMessage } from "../errorMessage.ts";
import { hasRealmRole } from "../roles.ts";
import { BookEventModal } from "./BookEventModal.tsx";
import { EventModal } from "./EventModal.tsx";

export type Event = {
  id: number;
  name: string;
  description: string | null;
  venue: string;
  date: number;
  capacity: number;
  availableTickets: number;
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
  const [booking, setBooking] = useState<Event>();
  const navigate = useNavigate();
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
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await errorMessage(response, "Failed to load events"),
          );
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
      setError(await errorMessage(response, "Failed to delete event"));
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
    {
      title: "Available Tickets",
      dataIndex: "availableTickets",
      align: "right",
    },
    { title: "Description", dataIndex: "description" },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, event: Event) => (
        <Space>
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            disabled={event.availableTickets === 0}
            onClick={() => setBooking(event)}
          >
            Book
          </Button>
          {isAdmin && (
            <>
              <Button icon={<EditOutlined />} onClick={() => setEditing(event)}>
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
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Events"
      extra={
        <Space>
          <Button
            icon={<OrderedListOutlined />}
            onClick={() => navigate("/bookings")}
          >
            My Bookings
          </Button>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAdding(true)}
            >
              Add Event
            </Button>
          )}
        </Space>
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
      <BookEventModal
        event={booking}
        onClose={() => setBooking(undefined)}
        onBooked={() => {
          setBooking(undefined);
          setReload(reload + 1);
        }}
      />
    </Card>
  );
}
