package vn.edu.crs.apigateway.filter;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;
import vn.edu.crs.apigateway.cache.ApiKeyValidationCache;
import vn.edu.crs.apigateway.client.AuthServiceClient;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GatewayFiltersTests {

    @Test
    void missingAuthorizationIsRejectedForProtectedRoute() {
        AuthHeaderFilter filter = new AuthHeaderFilter();
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/registrations").build());

        filter.filter(exchange, trackingChain()).block();

        assertThat(exchange.getResponse().getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void publicCourseGetDoesNotRequireAuthorization() {
        AuthHeaderFilter filter = new AuthHeaderFilter();
        AtomicBoolean forwarded = new AtomicBoolean();
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.method(HttpMethod.GET, "/api/courses").build());

        filter.filter(exchange, trackingChain(forwarded)).block();

        assertThat(forwarded).isTrue();
    }

    @Test
    void partnerRouteRejectsInvalidApiKey() {
        AuthServiceClient client = mock(AuthServiceClient.class);
        when(client.isValidForScope("wrong-key", "courses:read"))
                .thenReturn(Mono.just(false));
        ApiKeyFilter filter = new ApiKeyFilter(client, new ApiKeyValidationCache(30));
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/public/courses")
                        .header("X-API-KEY", "wrong-key")
                        .build());

        filter.filter(exchange, trackingChain()).block();

        assertThat(exchange.getResponse().getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void partnerCourseListAcceptsKeyWithReadScope() {
        AuthServiceClient client = mock(AuthServiceClient.class);
        when(client.isValidForScope("valid-key", "courses:read"))
                .thenReturn(Mono.just(true));
        ApiKeyFilter filter = new ApiKeyFilter(client, new ApiKeyValidationCache(30));
        AtomicBoolean forwarded = new AtomicBoolean();
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/public/courses")
                        .header("X-API-KEY", "valid-key")
                        .build());

        filter.filter(exchange, trackingChain(forwarded)).block();

        assertThat(forwarded).isTrue();
        verify(client).isValidForScope("valid-key", "courses:read");
    }

    @Test
    void partnerCourseDetailRequiresDetailScope() {
        AuthServiceClient client = mock(AuthServiceClient.class);
        when(client.isValidForScope("valid-key", "courses:read-detail"))
                .thenReturn(Mono.just(false));
        ApiKeyFilter filter = new ApiKeyFilter(client, new ApiKeyValidationCache(30));
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/public/courses/1")
                        .header("X-API-KEY", "valid-key")
                        .build());

        filter.filter(exchange, trackingChain()).block();

        assertThat(exchange.getResponse().getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        verify(client).isValidForScope("valid-key", "courses:read-detail");
    }

    private GatewayFilterChain trackingChain() {
        return ignored -> Mono.empty();
    }

    private GatewayFilterChain trackingChain(AtomicBoolean forwarded) {
        return ignored -> {
            forwarded.set(true);
            return Mono.empty();
        };
    }
}
