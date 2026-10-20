import { useAuth, withAuthenticationRequired } from "react-oidc-context";
import { EventList } from "./EventList/EventList.tsx";

function App() {
  const auth = useAuth();

  return (
    <main>
      <h1>
        Welcome to Event Ticket Booking, {auth.user?.profile.preferred_username}
      </h1>
      <EventList />
    </main>
  );
}

export default withAuthenticationRequired(App);
