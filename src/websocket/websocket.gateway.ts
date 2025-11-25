import { WebSocketGateway } from '@nestjs/websockets';
import { WebsocketService } from './websocket.service';

@WebSocketGateway()
export class WebsocketGateway {
  constructor(private readonly websocketService: WebsocketService) {}
}
