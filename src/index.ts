import { HeadersLike, toTupleArray } from "./headers";
import { ReadableStream } from "node:stream/web";
import { HTTP_METHODS, getMethod } from "./method";
import { Readable } from "node:stream";
import assert from "node:assert";

const getHeaderString = (name: string, val: string) =>
  `-H "${name}: ${`${val}`.replace(/(\\|")/g, "\\$1")}"`;

const normalizeHeaders = (
  headers: HeadersLike,
): {
  headers: [key: string, value: string][];
  isEncoding: boolean;
} =>
  toTupleArray(headers).reduce(
    (acc, [key, value]) => {
      if (key.toLocaleLowerCase() === "accept-encoding") {
        acc.isEncoding = true;
      }
      acc.headers.push([key, value]);
      return acc;
    },
    {
      headers: [] as [string, string][],
      isEncoding: false as boolean,
    },
  );

const escapeBody = (body: string): string =>
  typeof body === "string" ? body.replace(/'/g, `'\\''`) : body;

const generateBody = (body: unknown): string =>
  typeof body === "object"
    ? escapeBody(JSON.stringify(body))
    : typeof body === "string"
      ? escapeBody(body)
      : (() => {
          throw new Error(`Invalid body type: ${typeof body}`);
        })();

/**
 * @warn The node and typescript ecosystem are not synchronized with `fetch`
 * types. Node fetch type is incompat with libdom fetch which is incompat
 * with MSW fetch types. Use a loosey goosey Request for max compat.
 */
interface RequestLike {
  url: string;

  body?: unknown;
  headers?: HeadersLike;
  method?: string;
}

interface RequestInitLike {
  body?: unknown; // RequestInit["body"];
  headers?: HeadersLike;
  method?: string;
}

/**
 * Psuedo RequestInfo.
 * @see RequestLike
 */
type RequestInfoLike = RequestLike | string | URL;

const buildCurl = (
  requestInfo: RequestInfoLike,
  requestInit?: RequestInitLike,
  serialized?: {
    body?: string;
  },
) => {
  const [url, options] =
    typeof requestInfo === "string" || requestInfo instanceof URL
      ? ([requestInfo.toString(), requestInit ?? {}] as const)
      : ([
          (requestInfo || {}).url,
          requestInfo satisfies RequestInitLike as RequestInitLike,
        ] as const);
  const { body } = options;

  const serializedBody = serialized?.body;
  const formattedBody = serializedBody
    ? serializedBody
    : body
      ? generateBody(body)
      : undefined;

  const { headers, isEncoding } = normalizeHeaders(options.headers || {});
  return [
    "curl",
    // URL
    `'${url}'`,

    // Method
    "-X",
    getMethod(options.method ?? HTTP_METHODS.GET),

    // Headers
    ...headers.map(([k, v]) => getHeaderString(k, v)),

    // Body
    ...(formattedBody ? ["--data-binary", `'${formattedBody}'`] : []),

    // Flags
    isEncoding ? " --compressed" : undefined,
  ]
    .filter(Boolean)
    .join(" ");
};

const webStreamToString = async (stream: ReadableStream) => {
  const reader = stream.getReader();
  let result = await reader.read();
  let body = "";
  while (!result.done) {
    body += new TextDecoder().decode(result.value, { stream: true });
    result = await reader.read();
  }
  return body;
};

const nodeStreamToString = async (stream: Readable) => {
  let body = "";
  stream.on("data", (chunk) => {
    body += chunk;
  });
  assert(!stream.readableEnded, "Stream has already ended");
  return new Promise<string>((res, reject) => {
    stream.on("error", reject);
    stream.on("end", () => {
      return res(body);
    });
  });
};

const fromRequest = async (request: RequestLike) => {
  const serializedBody = await maybeSerializeBody(request.body);
  return buildCurl(request, undefined, { body: serializedBody });
};

export const fetchToCurl = async (
  requestInfo: RequestInfoLike,
  requestInit?: RequestInitLike,
) => {
  if (isRequestLike(requestInfo)) {
    return fromRequest(requestInfo);
  }

  if (!requestInit) {
    return buildCurl(requestInfo, requestInit);
  }

  const serializedBody = await maybeSerializeBody(
    requestInit.body,
    requestInit,
  );

  return buildCurl(requestInfo, requestInit, { body: serializedBody });
};

/**
 * @warn If there is a backing requestInit, it must be passed, otherwise,
 * the underlying stream will be consumed and break the actual requestInit
 * requesting serialiation.
 */
const maybeSerializeBody = async (
  initStream: unknown,
  requestInit?: RequestInitLike,
) => {
  if (initStream instanceof Readable) {
    return nodeStreamToString(initStream);
  }

  if (initStream instanceof ReadableStream) {
    const [s1, s2] = initStream.tee();
    if (requestInit) {
      requestInit.body = s2;
    }
    return webStreamToString(s1);
  }
};

const isRequestLike = (
  requestInfo: RequestInfoLike,
): requestInfo is RequestLike =>
  !!requestInfo &&
  "url" &&
  typeof requestInfo === "object" &&
  "url" in requestInfo;
