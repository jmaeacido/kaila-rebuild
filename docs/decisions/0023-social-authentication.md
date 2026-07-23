# ADR-0023: Server-verified social authentication

## Status

Accepted

## Decision

KAILA supports Google and Facebook OAuth authorization-code login through Laravel. Laravel owns state validation, exchanges the code, fetches the verified provider profile, and creates the browser session. Provider secrets never enter the Next.js client.

An existing account may be linked by a matching provider-verified email only when it has no different social identity. A different existing social subject is rejected rather than overwritten. New social accounts record the current Terms and Privacy Policy versions and may preserve provider intent from registration.

## Consequences

Deployments must configure the public KAILA URL and both provider credentials, and must register the exact callback URLs documented in the environment template. Social login fails closed when email is absent/unverified, state is expired, configuration is missing, or the provider response is invalid.
