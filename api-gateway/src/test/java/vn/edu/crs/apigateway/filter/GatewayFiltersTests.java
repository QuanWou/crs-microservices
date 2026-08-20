package vn.edu.crs.apigateway.filter;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

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
        ApiKeyFilter filter = new ApiKeyFilter();
        ReflectionTestUtils.setField(filter, "validApiKey", "valid-key");
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/public/courses")
                        .header("X-API-KEY", "wrong-key")
                        .build());

        filter.filter(exchange, trackingChain()).block();

        assertThat(exchange.getResponse().getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
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
