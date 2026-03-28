import { OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ path: '/ws', cors: { origin: true, credentials: true } })
export class MessagingGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  handleConnection(client: Socket) {
    client.emit('connection/authenticated', { ok: true });
  }

  emitMessage(chatId: string, payload: unknown) {
    this.server.to(chatId).emit('message:new', payload);
  }

  @SubscribeMessage('chat:join')
  onJoin(client: Socket, chatId: string) {
    client.join(chatId);
    client.emit('chat:join', { chatId });
  }

  @SubscribeMessage('typing:start')
  onTyping(client: Socket, payload: { chatId: string }) {
    client.to(payload.chatId).emit('typing:start', payload);
  }
}
