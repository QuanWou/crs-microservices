package vn.edu.crs.authservice.dto;

public record LoginResponseDTO(String token, Long userId, String username, String role) {
}
