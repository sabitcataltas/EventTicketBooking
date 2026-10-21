import "reflect-metadata";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SignJWT, exportJWK, generateKeyPair, type CryptoKey } from "jose";
import { SecurityService } from "./Service.ts";

const issuer = "http://localhost:8180/realms/event-ticket-booking";
const clientId = "event-ticket-booking-app";

let server: Server;
let privateKey: CryptoKey;
let service: SecurityService;

const sign = (
  claims: Record<string, unknown> = {},
  { key = privateKey, iss = issuer, exp = "5m" } = {},
) =>
  new SignJWT({ azp: clientId, ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setSubject("user-1")
    .setIssuer(iss)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);

before(async () => {
  const keys = await generateKeyPair("RS256");
  privateKey = keys.privateKey;
  const jwk = {
    ...(await exportJWK(keys.publicKey)),
    kid: "test",
    alg: "RS256",
  };
  server = createServer((_, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  service = new SecurityService(
    new ConfigService({
      OIDC_ISSUER: issuer,
      OIDC_JWKS_URI: `http://127.0.0.1:${port}/certs`,
      OIDC_CLIENT_ID: clientId,
    }),
  );
});

after(() => {
  server.close();
});

test("verify returns the claims of a valid token", async () => {
  const claims = await service.verify(await sign({ email: "a@b.c" }));

  assert.equal(claims.sub, "user-1");
  assert.equal(claims.email, "a@b.c");
});

test("verify rejects invalid tokens with 401", async () => {
  const { privateKey: otherKey } = await generateKeyPair("RS256");
  const tokens = [
    "not-a-jwt",
    await sign({}, { key: otherKey }),
    await sign({}, { iss: "http://evil/realms/event-ticket-booking" }),
    await sign({}, { exp: "-1m" }),
    await sign({ azp: "other-client" }),
  ];

  for (const token of tokens) {
    await assert.rejects(service.verify(token), UnauthorizedException, token);
  }
});
