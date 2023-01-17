const epoch = 1574773581000n // Tue Nov 26 2019 21:06:21 GMT+0800
const TIMESTAMP_SHIFT = 22n

let increment = 0n

export default function snowflake() {
  const timestamp = Date.now()
  const result = ((BigInt(timestamp) - epoch) << TIMESTAMP_SHIFT) + (increment++)
  increment %= 0xfffn
  return result
}

// https://discord.com/developers/docs/reference#snowflakes
export function toTimestamp(snowflake: bigint) {
  return (snowflake >> TIMESTAMP_SHIFT) + epoch
}
