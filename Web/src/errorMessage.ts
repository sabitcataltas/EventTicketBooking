type ErrorBody = { message?: string | string[] };

export async function errorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  const message = Array.isArray(body.message)
    ? body.message.join(", ")
    : body.message;
  return message || `${fallback} (${response.status})`;
}
