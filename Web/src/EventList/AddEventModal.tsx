import {
  Alert,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  type DatePickerProps,
} from "antd";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { config } from "../config.ts";

type AddEventForm = {
  name: string;
  description?: string;
  venue: string;
  date: NonNullable<DatePickerProps["value"]>;
  capacity: number;
};

type AddEventModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function AddEventModal({
  open,
  onClose,
  onCreated,
}: AddEventModalProps) {
  const auth = useAuth();
  const [form] = Form.useForm<AddEventForm>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (values: AddEventForm) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch(`${config.apiUrl}/events`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${auth.user?.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description || null,
          venue: values.venue,
          date: values.date.valueOf(),
          capacity: values.capacity,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create event (${response.status})`);
      }
      form.resetFields();
      onCreated();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Add Event"
      open={open}
      okText="Create"
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
      <Form form={form} layout="vertical" onFinish={submit} preserve={false}>
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, whitespace: true, max: 200 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ max: 2000 }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          name="venue"
          label="Venue"
          rules={[{ required: true, whitespace: true, max: 200 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="date" label="Date" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="capacity"
          label="Capacity"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} precision={0} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
