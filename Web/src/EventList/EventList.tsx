import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { config } from "../config.ts";
import { hasRealmRole } from "../roles.ts";

type Event = {
  id: number;
  name: string;
  description: string | null;
  venue: string;
  date: number;
  capacity: number;
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
  }, [accessToken, after]);

  const hasNext = page?.items.length === pageSize;

  return (
    <section>
      <header>
        <h2>Events</h2>
        {isAdmin && <button type="button">Add Event</button>}
      </header>
      {error && <p role="alert">{error}</p>}
      {page && page.items.length === 0 && <p>No events found.</p>}
      {page && page.items.length > 0 && (
        <ul>
          {page.items.map((event) => (
            <li key={event.id}>
              <h3>{event.name}</h3>
              <p>
                {new Date(event.date).toLocaleString()} · {event.venue} ·
                Capacity {event.capacity}
              </p>
              {event.description && <p>{event.description}</p>}
            </li>
          ))}
        </ul>
      )}
      <nav>
        <button
          type="button"
          disabled={cursors.length === 1}
          onClick={() => setCursors(cursors.slice(0, -1))}
        >
          Previous
        </button>
        <span>Page {cursors.length}</span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => setCursors([...cursors, page!.next])}
        >
          Next
        </button>
      </nav>
    </section>
  );
}
