import { LogoutOutlined } from "@ant-design/icons";
import { Alert, Button, Layout, Spin, Typography } from "antd";
import { useAuth, withAuthenticationRequired } from "react-oidc-context";
import { config } from "./config.ts";
import { EventList } from "./EventList/EventList.tsx";
import { useCurrentUser } from "./UserManagement/useCurrentUser.ts";

function App() {
  const auth = useAuth();
  const { user, error } = useCurrentUser();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
          Welcome to Event Ticket Booking,{" "}
          {auth.user?.profile.preferred_username}
        </Typography.Title>
        <Button
          icon={<LogoutOutlined />}
          onClick={() =>
            auth.signoutRedirect({
              post_logout_redirect_uri: config.oidc.redirectUri,
            })
          }
        >
          Logout
        </Button>
      </Layout.Header>
      <Layout.Content style={{ padding: 24 }}>
        {error ? (
          <Alert type="error" title={error} showIcon />
        ) : user ? (
          <EventList />
        ) : (
          <Spin />
        )}
      </Layout.Content>
    </Layout>
  );
}

export default withAuthenticationRequired(App);
