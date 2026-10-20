import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

@Injectable()
export class SecurityService {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly clientId: string;

  constructor(config: ConfigService) {
    this.jwks = createRemoteJWKSet(
      new URL(config.getOrThrow<string>("OIDC_JWKS_URI")),
    );
    this.issuer = config.getOrThrow<string>("OIDC_ISSUER");
    this.clientId = config.getOrThrow<string>("OIDC_CLIENT_ID");
  }

  public async verify(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        requiredClaims: ["sub", "exp"],
      });
      if (payload.azp !== this.clientId) {
        throw new Error("Unexpected authorized party");
      }
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }
}
