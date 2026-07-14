"use client";

import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_BASE } from "./api";

export type AuctionEvent = {
  type: string;
  at: string;
  data: any;
};

export function createAuctionSocket(onEvent: (evt: AuctionEvent) => void): Client {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${WS_BASE}/ws`) as any,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  });
  client.onConnect = () => {
    client.subscribe("/topic/auction", (msg: IMessage) => {
      try {
        const parsed = JSON.parse(msg.body);
        onEvent(parsed);
      } catch (e) {
        console.warn("bad ws msg", e);
      }
    });
  };
  client.activate();
  return client;
}
