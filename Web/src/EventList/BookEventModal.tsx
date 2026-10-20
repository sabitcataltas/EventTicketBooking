import { Alert, Form, InputNumber, Modal, Typography } from "antd";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { config } from "../config.ts";
import type { Event } from "./EventList.tsx";

type BookEventForm = {
  quantity: number;
};

type BookEventModalProps = {
  event?: Event;
  onClose: () => void;
  onBooked: () => void;
};

export function BookEventModal({
  event,
  onClose,
  onBooked,
}: BookEventModalProps) {
  const auth = useAuth();
  const [form] = Form.useForm<BookEventForm>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async ({ quantity }: BookEventForm) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch(
        `${config.apiUrl}/events/${event!.id}/bookings`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${auth.user?.access_token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ quantity }),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to book event (${response.status})`);
      }
      form.resetFields();
      onBooked();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Book ${event?.name}`}
      open={!!event}
      okText="Book"
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={() => {
        setError(undefined);
        onClose();
      }}
      destroyOnHidden
    >
      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Typography.Paragraph>
        Available tickets: {event?.availableTickets}
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        preserve={false}
        initialValues={{ quantity: 1 }}
      >
        <Form.Item
          name="quantity"
          label="Quantity"
          rules={[{ required: true }]}
        >
          <InputNumber
            min={1}
            max={event?.availableTickets}
            precision={0}
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
