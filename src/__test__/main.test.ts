import { fetchToCurl } from "../";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";
import { TextEncoder } from "node:util";
import * as assert from "node:assert";
import * as nodeFetch from "node-fetch";
import * as test from "node:test";

const { describe, it } = test;

const createTestReadableWebStream = () =>
  new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(JSON.stringify({ foo: "bar" })));
      controller.close();
    },
  });

const createTestReadableNodeStream = () => {
  class StringStream extends Readable {
    str: string | null;
    constructor(str: string, opts?: any) {
      super(opts);
      this.str = str;
    }
    _read() {
      this.push(this.str);
      this.str = null; // Ensure the string is only pushed once
    }
  }
  return new StringStream(JSON.stringify({ foo: "bar" }));
};

describe("fetchToCurl", () => {
  const kases: { params: Parameters<typeof fetchToCurl>; expected: string }[] =
    [
      { params: ["google.com"], expected: "curl 'google.com' -X GET" },
      { params: ["google.com", {}], expected: "curl 'google.com' -X GET" },
      {
        params: [new URL("https://google.com/")],
        expected: "curl 'https://google.com/' -X GET",
      },
      {
        params: ["google.com", { method: "POST" }],
        expected: "curl 'google.com' -X POST",
      },
      {
        params: [{ url: "google.com", method: "POST" }],
        expected: "curl 'google.com' -X POST",
      },
      {
        params: [
          new Request("https://google.com", {
            method: "POST",
            body: createTestReadableWebStream(),
            duplex: "half",
          }),
        ],
        expected: `curl 'https://google.com/' -X POST --data-binary '{"foo":"bar"}'`,
      },
      {
        params: [
          new nodeFetch.Request("https://google.com", {
            method: "POST",
            body: createTestReadableNodeStream(),
          }),
        ],
        expected: `curl 'https://google.com/' -X POST --data-binary '{"foo":"bar"}'`,
      },
    ];

  for (const i in kases) {
    const { params, expected } = kases[i]!;
    it(`should handle case ${i}`, async () => {
      assert.equal(
        await fetchToCurl(...params),
        expected,
        `Case ${i} failed (${params})`,
      );
    });
  }
});
