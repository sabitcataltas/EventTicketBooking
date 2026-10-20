import {
  ArrowLeftOutlined,
  CloseOutlined,
  LeftOutlined,
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
  Tag,
  Typography,
  type TableColumnsType,
} from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router";
import { config } from "../config.ts";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

type Booking = {
  id: number;
  eventId: number;
  quantity: number;
  status: BookingStatus;
  expiresAt: number;
  createdAt: string;
  version: number;
};

type BookingPage = { items: Booking[]; next: number };

const pageSize = 10;

const statusColors: Record<BookingStatus, string> = {
  PENDING: "gold",
  CONFIRMED: "green",
  CANCELLED: "default",
  EXPIRED: "red",
};

export function MyBookings() {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessToken = auth.user?.access_token;
  const [cursors, setCursors] = useState<number[]>([0]);
  const [page, setPage] = useState<BookingPage>();
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  const after = cursors.at(-1)!;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      limit: String(pageSize),
      after: String(after),
    });
    fetch(`${config.apiUrl}/events/bookings?${query}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load bookings (${response.status})`);
        }
        return response.json() as Promise<BookingPage>;
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

  const cancel = async (booking: Booking) => {
    const response = await fetch(
      `${config.apiUrl}/events/${booking.eventId}/bookings/${booking.id}/cancel`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ version: booking.version }),
      },
    );
    if (!response.ok) {
      setError(`Failed to cancel booking (${response.status})`);
      return;
    }
    setReload(reload + 1);
  };

  const hasNext = page?.items.length === pageSize;

  const columns: TableColumnsType<Booking> = [
    { title: "Booking", dataIndex: "id" },
    { title: "Event", dataIndex: "eventId" },
    { title: "Quantity", dataIndex: "quantity", align: "right" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: BookingStatus) => (
        <Tag color={statusColors[status]}>{status}</Tag>
      ),
    },
    {
      title: "Booked At",
      dataIndex: "createdAt",
      render: (createdAt: string) => new Date(createdAt).toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, booking: Booking) =>
        (booking.status === "PENDING" || booking.status === "CONFIRMED") && (
          <Popconfirm
            title="Cancel this booking?"
            okText="Cancel Booking"
            cancelText="Keep"
            okButtonProps={{ danger: true }}
            onConfirm={() => cancel(booking)}
          >
            <Button danger icon={<CloseOutlined />}>
              Cancel
            </Button>
          </Popconfirm>
        ),
    },
  ];

  return (
    <Card
      title="My Bookings"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/")}>
          Back to Events
        </Button>
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
          locale={{ emptyText: "No bookings found." }}
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
    </Card>
  );
}
