package com.neml.badminton.websocket;

import com.neml.badminton.dto.Dtos.AuctionStateDto;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

@Component
public class AuctionBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    public AuctionBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void broadcastState(AuctionStateDto state) {
        messagingTemplate.convertAndSend("/topic/auction", Map.of(
                "type", "STATE",
                "at", Instant.now().toString(),
                "data", state
        ));
    }

    public void broadcastEvent(String eventType, Object data) {
        messagingTemplate.convertAndSend("/topic/auction", Map.of(
                "type", eventType,
                "at", Instant.now().toString(),
                "data", data
        ));
    }
}
