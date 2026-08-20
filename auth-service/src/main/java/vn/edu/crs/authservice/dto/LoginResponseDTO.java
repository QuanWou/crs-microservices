package vn.edu.crs.authservice.dto;

public record LoginResponseDTO(String token, String username, String role) {
}
