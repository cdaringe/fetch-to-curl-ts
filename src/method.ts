import assert from "assert";

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
};

type HttpMethod = keyof typeof HTTP_METHODS;

function assertMethod(method: string): asserts method is HttpMethod {
  assert.ok(method in HTTP_METHODS, `Invalid method: ${method}`);
}

export const getMethod = (method: string) => {
  const index = method.toUpperCase();
  assertMethod(index);
  return HTTP_METHODS[index as HttpMethod];
};
