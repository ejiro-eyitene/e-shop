import { dbUnavailable } from "../src/lib/dbFallback";

const cases: [string, unknown][] = [
  [
    "Neon ConnectTimeoutError (the IPv6 black-hole)",
    Object.assign(new Error("Failed query: select * from products"), {
      sourceError: Object.assign(new TypeError("fetch failed"), {
        cause: Object.assign(new Error("Connect Timeout Error"), {
          code: "UND_ERR_CONNECT_TIMEOUT",
        }),
      }),
    }),
  ],
  ["plain fetch failure", new Error("Error connecting to database: fetch failed")],
  [
    // Intentionally NOT treated as an outage: an error carrying no diagnostic
    // signal at all cannot be identified as a connection problem, and guessing
    // would mask genuine bugs by rendering an empty catalogue instead of failing.
    "opaque error with no signal (not treated as outage)",
    Object.assign(new Error("something went wrong"), { sourceError: {} }),
  ],
  ["genuine SQL error (must NOT be swallowed)", new Error('relation "products" does not exist')],
];

for (const [label, error] of cases) {
  const expected =
    label.includes("not treated as outage") || label.includes("must NOT")
      ? false
      : true;
  const actual = dbUnavailable(error);
  const pass = actual === expected;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${label} -> dbUnavailable=${actual} (expected ${expected})`,
  );
}