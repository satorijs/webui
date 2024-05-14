import { Status } from '@satorijs/protocol'

export function getStatus(status: Status) {
  switch (status) {
    case Status.OFFLINE: return 'offline'
    case Status.ONLINE: return 'online'
    case Status.CONNECT: return 'connect'
    case Status.DISCONNECT: return 'disconnect'
    case Status.RECONNECT: return 'reconnect'
  }
}
