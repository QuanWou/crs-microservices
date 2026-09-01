package vn.edu.crs.registrationservice.security;

public record JwtPrincipal(Long userId, String username) {
}
