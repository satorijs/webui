// https://discord.com/developers/docs/reference#snowflakes
// timestamp      63 to 22      42 bits       (snowflake >> 22) + 1420070400000
// worker ID      21 to 17      5 bits        (snowflake & 0x3E0000) >> 17
// process ID     16 to 12      5 bits        (snowflake & 0x1F000) >> 12
// increment      11 to 0       12 bits       snowflake & 0xFFF

const epoch = 1574773581000n // Tue Nov 26 2019 21:06:21 GMT+0800
const TIMESTAMP_SHIFT = 22n

let increment = 0n

export default function snowflake() {
  const timestamp = Date.now()
  const result = ((BigInt(timestamp) - epoch) << TIMESTAMP_SHIFT) + (increment++)
  increment %= 0xfffn
  return result
}

export function toTimestamp(snowflake: bigint) {
  return (snowflake >> TIMESTAMP_SHIFT) + epoch
}
