type HeadersRecord = Record<string, string | string[]>;
export type HeadersLike = Iterable<[string, string]> | HeadersRecord | Required<RequestInit>["headers"];

export const toTupleArray = (headers: HeadersLike): [string, string][] =>
  "entries" in headers && typeof headers.entries === "function"
    ? [...(headers as unknown as Headers)]
    : Object.entries(headers as HeadersRecord).flatMap(([key, value]) =>
        typeof value === "string"
          ? [[key, value]]
          : value.map((val) => [key, val] as [string, string]),
      );
