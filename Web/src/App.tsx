import { Layout, Typography } from "antd";
import { useAuth, withAuthenticationRequired } from "react-oidc-context";
import { EventList } from "./EventList/EventList.tsx";

function App() {
  const auth = useAuth();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header style={{ display: "flex", alignItems: "center" }}>
        <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
          Welcome to Event Ticket Booking,{" "}
          {auth.user?.profile.preferred_username}
        </Typography.Title>
      </Layout.Header>
      <Layout.Content style={{ padding: 24 }}>
        <EventList />
      </Layout.Content>
    </Layout>
  );
}

export default withAuthenticationRequired(App);
