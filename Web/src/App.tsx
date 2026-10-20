import { useAuth, withAuthenticationRequired } from "react-oidc-context";

function App() {
  const auth = useAuth();

  return (
    <h1>
      Welcome to Event Ticket Booking, {auth.user?.profile.preferred_username}
    </h1>
  );
}

export default withAuthenticationRequired(App);
