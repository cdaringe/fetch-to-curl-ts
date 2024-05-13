# fetch-to-curl-ts

Convert [fetch](https://mdn.io/fetch) inputs to a [cURL](https://curl.se) string.

Fork of [leoek/fetch-to-curl](https://github.com/leoek/fetch-to-curl) with
improved TypeScript support and improved payload serialization.

[![main](https://github.com/cdaringe/fetch-to-curl-ts/actions/workflows/main.yml/badge.svg)](https://github.com/cdaringe/fetch-to-curl-ts/actions/workflows/main.yml)

## Installation

```sh
npm install fetch-to-curl-ts
yarn add fetch-to-curl-ts
pnpm install fetch-to-curl-ts
```


## Usage

```js
import { fetchToCurl } from 'fetch-to-curl';
const curlString = await fetchToCurl('https://jsonplaceholder.typicode.com/posts/1', {
  headers: {
    accept: 'application/json'
  }
});
// curlString ===
// curl "https://jsonplaceholder.typicode.com/posts/1" -X GET -H 'accept: application/json'
```

See [./src/__test__/main.test.ts](./src/__test__/main.test.ts) for more examples.
