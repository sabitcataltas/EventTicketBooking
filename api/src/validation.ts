import {
  BadRequestException,
  applyDecorators,
  type PipeTransform,
} from "@nestjs/common";
import { ApiQuery, type SchemaObject } from "@nestjs/swagger";
import { z } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  public transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map(({ path, message }) =>
          path.length ? `${path.join(".")}: ${message}` : message,
        ),
      );
    }
    return result.data;
  }
}

export function toOpenApi(schema: z.ZodType): SchemaObject {
  return z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io: "input",
  }) as SchemaObject;
}

export function ApiQueryFrom(schema: z.ZodObject): MethodDecorator {
  const { properties = {}, required = [] } = toOpenApi(schema);
  return applyDecorators(
    ...Object.entries(properties).map(([name, property]) =>
      ApiQuery({ name, required: required.includes(name), schema: property }),
    ),
  );
}
