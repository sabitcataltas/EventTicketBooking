import { z } from "zod";

export const createEventSchema = z.strictObject({
  name: z.string().min(1).max(200).meta({ example: "Concert" }),
  description: z
    .string()
    .max(2000)
    .nullable()
    .default(null)
    .meta({ example: "Live music" }),
  venue: z.string().min(1).max(200).meta({ example: "Arena" }),
  date: z.int().min(0).meta({
    description: "Event start as Unix epoch milliseconds",
    example: 1799870400000,
  }),
  capacity: z.int().min(1).meta({ example: 100 }),
});

export const updateEventSchema = createEventSchema.extend({
  version: z.int().min(1).meta({
    description: "Version last read by the client, for optimistic locking",
    example: 1,
  }),
});

export const listEventsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional().meta({
    description: "Maximum number of events to return, defaults to 10",
  }),
  after: z.coerce.number().int().min(0).optional().meta({
    description: "Return events with an id greater than this cursor",
  }),
});

export type CreateEventDto = z.output<typeof createEventSchema>;
export type UpdateEventDto = z.output<typeof updateEventSchema>;
export type ListEventsQueryDto = z.output<typeof listEventsQuerySchema>;
