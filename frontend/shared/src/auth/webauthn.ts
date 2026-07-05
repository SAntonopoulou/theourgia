/**
 * Browser-side WebAuthn ceremony helpers.
 *
 * The backend hands us the *options* dict returned by py-webauthn's
 * `generate_registration_options` / `generate_authentication_options`
 * (base64url-encoded fields). The browser API wants those fields as
 * ArrayBuffer / Uint8Array. These helpers do the base64url conversion,
 * call `navigator.credentials.{create,get}`, then convert the response
 * back to JSON with base64url string fields — the shape py-webauthn's
 * `verify_registration_response` / `verify_authentication_response`
 * expect.
 *
 * No third-party dependency: the whole conversion layer is ~30 lines
 * of TypedArray + string manipulation.
 */

export function isWebauthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials?.create === "function" &&
    typeof navigator.credentials?.get === "function"
  );
}

function b64urlDecode(input: string): ArrayBuffer {
  const pad = 4 - (input.length % 4);
  const padded = pad === 4 ? input : input + "=".repeat(pad);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i += 1) view[i] = bin.charCodeAt(i);
  return buf;
}

function b64urlEncode(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i += 1)
    bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface CreationOptions {
  challenge: string;
  rp: PublicKeyCredentialRpEntity;
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  excludeCredentials?: { id: string; type: string; transports?: string[] }[];
  extensions?: AuthenticationExtensionsClientInputs;
}

interface RequestOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: { id: string; type: string; transports?: string[] }[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

function normaliseCreationOptions(
  opts: CreationOptions,
): PublicKeyCredentialCreationOptions {
  return {
    challenge: b64urlDecode(opts.challenge),
    rp: opts.rp,
    user: {
      id: b64urlDecode(opts.user.id),
      name: opts.user.name,
      displayName: opts.user.displayName,
    },
    pubKeyCredParams: opts.pubKeyCredParams,
    timeout: opts.timeout,
    attestation: opts.attestation,
    authenticatorSelection: opts.authenticatorSelection,
    excludeCredentials: opts.excludeCredentials?.map((c) => ({
      id: b64urlDecode(c.id),
      type: c.type as PublicKeyCredentialType,
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
    extensions: opts.extensions,
  };
}

function normaliseRequestOptions(
  opts: RequestOptions,
): PublicKeyCredentialRequestOptions {
  return {
    challenge: b64urlDecode(opts.challenge),
    timeout: opts.timeout,
    rpId: opts.rpId,
    allowCredentials: opts.allowCredentials?.map((c) => ({
      id: b64urlDecode(c.id),
      type: c.type as PublicKeyCredentialType,
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
    userVerification: opts.userVerification,
    extensions: opts.extensions,
  };
}

function serialiseAttestation(
  cred: PublicKeyCredential,
): Record<string, unknown> {
  const attestation = cred.response as AuthenticatorAttestationResponse;
  return {
    id: cred.id,
    rawId: b64urlEncode(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment,
    response: {
      clientDataJSON: b64urlEncode(attestation.clientDataJSON),
      attestationObject: b64urlEncode(attestation.attestationObject),
      transports:
        (attestation.getTransports?.() as string[] | undefined) ?? [],
    },
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
  };
}

function serialiseAssertion(
  cred: PublicKeyCredential,
): Record<string, unknown> {
  const assertion = cred.response as AuthenticatorAssertionResponse;
  return {
    id: cred.id,
    rawId: b64urlEncode(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment,
    response: {
      clientDataJSON: b64urlEncode(assertion.clientDataJSON),
      authenticatorData: b64urlEncode(assertion.authenticatorData),
      signature: b64urlEncode(assertion.signature),
      userHandle: assertion.userHandle
        ? b64urlEncode(assertion.userHandle)
        : null,
    },
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
  };
}

export async function runRegistrationCeremony(
  options: CreationOptions,
): Promise<Record<string, unknown>> {
  if (!isWebauthnSupported()) {
    throw new Error(
      "WebAuthn is not available in this browser. Try Chrome, Safari, Firefox, or Edge on HTTPS.",
    );
  }
  const publicKey = normaliseCreationOptions(options);
  const cred = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;
  if (cred === null) {
    throw new Error("Registration was cancelled.");
  }
  return serialiseAttestation(cred);
}

export async function runAssertionCeremony(
  options: RequestOptions,
): Promise<Record<string, unknown>> {
  if (!isWebauthnSupported()) {
    throw new Error(
      "WebAuthn is not available in this browser. Try Chrome, Safari, Firefox, or Edge on HTTPS.",
    );
  }
  const publicKey = normaliseRequestOptions(options);
  const cred = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;
  if (cred === null) {
    throw new Error("Sign-in was cancelled.");
  }
  return serialiseAssertion(cred);
}
