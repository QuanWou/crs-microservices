package vn.edu.crs.authservice.dto;

import java.time.LocalDateTime;

public record ApiKeyResponseDTO(
        Long id,
        String keyValue,
        String ownerName,
        String scopes,
        String status,
        LocalDateTime expiresAt,
        LocalDateTime createdAt
) {
}
