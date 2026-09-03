package vn.edu.crs.authservice.service;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.crs.authservice.dto.ApiKeyCreateRequestDTO;
import vn.edu.crs.authservice.dto.ApiKeyResponseDTO;
import vn.edu.crs.authservice.entity.ApiKey;
import vn.edu.crs.authservice.repository.ApiKeyRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

@Service
public class ApiKeyService {

    private static final String ACTIVE = "ACTIVE";
    private static final String REVOKED = "REVOKED";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Set<String> SUPPORTED_SCOPES = Set.of(
            "courses:read",
            "courses:read-detail"
    );

    private final ApiKeyRepository apiKeyRepository;

    public ApiKeyService(ApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    @Transactional
    public ApiKeyResponseDTO create(ApiKeyCreateRequestDTO dto) {
        LocalDateTime now = LocalDateTime.now();
        ApiKey apiKey = new ApiKey();
        apiKey.setKeyValue(generateRandomKey());
        apiKey.setOwnerName(dto.getOwnerName().trim());
        apiKey.setScopes(normalizeScopes(dto.getScopes()));
        apiKey.setStatus(ACTIVE);
        apiKey.setCreatedAt(now);
        apiKey.setExpiresAt(dto.getValidDays() == null ? null : now.plusDays(dto.getValidDays()));
        return toDTO(apiKeyRepository.save(apiKey), true);
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponseDTO> getAll() {
        return apiKeyRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(key -> toDTO(key, false))
                .toList();
    }

    @Transactional
    public void revoke(Long id) {
        ApiKey apiKey = apiKeyRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy API Key id = " + id));
        apiKey.setStatus(REVOKED);
        apiKeyRepository.save(apiKey);
    }

    @Transactional(readOnly = true)
    public boolean isValidForScope(String keyValue, String requiredScope) {
        if (keyValue == null || keyValue.isBlank() || !SUPPORTED_SCOPES.contains(requiredScope)) {
            return false;
        }
        return apiKeyRepository.findByKeyValue(keyValue)
                .filter(key -> ACTIVE.equals(key.getStatus()))
                .filter(key -> key.getExpiresAt() == null || key.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(ApiKey::getScopes)
                .map(this::splitScopes)
                .filter(scopes -> scopes.contains(requiredScope))
                .isPresent();
    }

    private String normalizeScopes(String rawScopes) {
        LinkedHashSet<String> scopes = splitScopes(rawScopes);
        if (scopes.isEmpty()) {
            throw new IllegalArgumentException("Danh sách scope không được để trống");
        }
        List<String> unsupported = scopes.stream()
                .filter(scope -> !SUPPORTED_SCOPES.contains(scope))
                .toList();
        if (!unsupported.isEmpty()) {
            throw new IllegalArgumentException("Scope không được hỗ trợ: " + String.join(", ", unsupported));
        }
        return String.join(",", scopes);
    }

    private LinkedHashSet<String> splitScopes(String rawScopes) {
        LinkedHashSet<String> result = new LinkedHashSet<>();
        if (rawScopes == null) return result;
        for (String scope : rawScopes.split(",")) {
            String normalized = scope.trim();
            if (!normalized.isEmpty()) result.add(normalized);
        }
        return result;
    }

    private String generateRandomKey() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return "crs_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private ApiKeyResponseDTO toDTO(ApiKey key, boolean includeSecret) {
        return new ApiKeyResponseDTO(
                key.getId(),
                includeSecret ? key.getKeyValue() : null,
                key.getOwnerName(),
                key.getScopes(),
                key.getStatus(),
                key.getExpiresAt(),
                key.getCreatedAt()
        );
    }
}
