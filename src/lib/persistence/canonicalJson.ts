function assertSupported(value: unknown, path: string, seen: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Canonical JSON requires a finite number at ${path}.`);
    }
    return JSON.stringify(value);
  }
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    throw new TypeError(`Unsupported canonical JSON value at ${path}.`);
  }
  if (typeof value !== "object") {
    throw new TypeError(`Unsupported canonical JSON value at ${path}.`);
  }
  if (seen.has(value)) throw new TypeError(`Circular canonical JSON value at ${path}.`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value
        .map((item, index) => assertSupported(item, `${path}[${index}]`, seen))
        .join(",")}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Canonical JSON requires plain objects at ${path}.`);
    }
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${assertSupported(record[key], `${path}.${key}`, seen)}`
      )
      .join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

/** Deterministic JSON for integrity checks. Object keys sort; array order remains significant. */
export function canonicalStringify(value: unknown): string {
  return assertSupported(value, "$", new Set());
}
