package vn.edu.crs.authservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.edu.crs.authservice.dto.ApiKeyCreateRequestDTO;
import vn.edu.crs.authservice.entity.ApiKey;
import vn.edu.crs.authservice.repository.ApiKeyRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ApiKeyServiceTests {

    private ApiKeyRepository repository;
    private ApiKeyService service;

    @BeforeEach
    void setUp() {
        repository = mock(ApiKeyRepository.class);
        service = new ApiKeyService(repository);
    }

    @Test
    void createGeneratesRandomSecretAndNormalizesScopes() {
        when(repository.save(any(ApiKey.class))).thenAnswer(invocation -> {
            ApiKey key = invocation.getArgument(0);
            key.setId(1L);
            return key;
        });
        ApiKeyCreateRequestDTO request = request("Đối tác Test", "courses:read, courses:read", 30);

        var response = service.create(request);

        assertThat(response.keyValue()).startsWith("crs_").hasSize(36);
        assertThat(response.scopes()).isEqualTo("courses:read");
        assertThat(response.status()).isEqualTo("ACTIVE");
        assertThat(response.expiresAt()).isAfter(LocalDateTime.now().plusDays(29));
    }

    @Test
    void listNeverReturnsStoredSecret() {
        ApiKey stored = activeKey("crs_secret", "courses:read");
        when(repository.findAll(any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(stored));

        var response = service.getAll();

        assertThat(response).singleElement().extracting(item -> item.keyValue()).isNull();
    }

    @Test
    void activeUnexpiredKeyIsValidOnlyForGrantedScope() {
        ApiKey stored = activeKey("crs_secret", "courses:read");
        when(repository.findByKeyValue("crs_secret")).thenReturn(Optional.of(stored));

        assertThat(service.isValidForScope("crs_secret", "courses:read")).isTrue();
        assertThat(service.isValidForScope("crs_secret", "courses:read-detail")).isFalse();
    }

    @Test
    void unsupportedScopeIsRejectedAtCreation() {
        ApiKeyCreateRequestDTO request = request("Đối tác Test", "registrations:write", 30);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Scope không được hỗ trợ");
    }

    private ApiKeyCreateRequestDTO request(String owner, String scopes, Integer validDays) {
        ApiKeyCreateRequestDTO request = new ApiKeyCreateRequestDTO();
        request.setOwnerName(owner);
        request.setScopes(scopes);
        request.setValidDays(validDays);
        return request;
    }

    private ApiKey activeKey(String value, String scopes) {
        ApiKey key = new ApiKey();
        key.setId(1L);
        key.setKeyValue(value);
        key.setOwnerName("Đối tác Test");
        key.setScopes(scopes);
        key.setStatus("ACTIVE");
        key.setCreatedAt(LocalDateTime.now());
        key.setExpiresAt(LocalDateTime.now().plusDays(1));
        return key;
    }
}
