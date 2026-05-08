import {
  WebSocketGateway, SubscribeMessage, MessageBody,
  ConnectedSocket, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { FirebaseService } from '../../firebase/firebase.service'

/**
 * WebSocket Gateway — handles real-time presence and typing indicators.
 * Actual message storage is handled directly by the client via Firestore SDK.
 * The server NEVER receives plaintext — it only relays presence events.
 */
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL }, namespace: '/ws' })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server

  private connectedUsers = new Map<string, string>()   // uid → socketId

  constructor(private readonly firebase: FirebaseService) {}

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth['token'] as string | undefined
    if (!token) { socket.disconnect(); return }

    try {
      const decoded = await this.firebase.auth.verifyIdToken(token)
      this.connectedUsers.set(decoded.uid, socket.id)
      socket.data['uid'] = decoded.uid
      socket.join(`user:${decoded.uid}`)
      this.server.emit('presence', { uid: decoded.uid, online: true })
    } catch {
      socket.disconnect()
    }
  }

  handleDisconnect(socket: Socket) {
    const uid = socket.data['uid'] as string | undefined
    if (uid) {
      this.connectedUsers.delete(uid)
      this.server.emit('presence', { uid, online: false })
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: Socket
  ) {
    const uid = socket.data['uid'] as string
    socket.to(`conversation:${data.conversationId}`).emit('typing', { uid })
  }

  @SubscribeMessage('join_conversation')
  handleJoin(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: Socket
  ) {
    socket.join(`conversation:${data.conversationId}`)
  }
}
