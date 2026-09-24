import { discovery, type Configuration } from 'openid-client';

let oidcConfiguration: Promise<Configuration | undefined> | undefined;

export function getOidcConfiguration(): Promise<Configuration | undefined> {
  if (oidcConfiguration) return oidcConfiguration;

  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  if (!issuer || !clientId) return Promise.resolve(undefined);

  oidcConfiguration = discovery(
    new URL(issuer),
    clientId,
    process.env.OIDC_CLIENT_SECRET,
  );
  return oidcConfiguration;
}
