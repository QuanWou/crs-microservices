package vn.edu.crs.apigateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import vn.edu.crs.apigateway.cache.ApiKeyValidationCache;
import vn.edu.crs.apigateway.client.AuthServiceClient;

@Component
public class ApiKeyFilter implements GlobalFilter, Ordered {

    private static final String PARTNER_COURSES_PATH = "/api/public/courses";

    private final AuthServiceClient authServiceClient;
    private final ApiKeyValidationCache cache;

    public ApiKeyFilter(
            AuthServiceClient authServiceClient,
            ApiKeyValidationCache cache) {
        this.authServiceClient = authServiceClient;
        this.cache = cache;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        String requiredScope = requiredScope(path);
        if (requiredScope == null) {
            return chain.filter(exchange);
        }

        String apiKey = request.getHeaders().getFirst("X-API-KEY");
        if (apiKey == null || apiKey.isBlank()) {
            return reject(exchange);
        }

        String cacheKey = apiKey + ":" + requiredScope;
        Boolean cached = cache.get(cacheKey);
        if (cached != null) {
            return cached ? chain.filter(exchange) : reject(exchange);
        }

        return authServiceClient.isValidForScope(apiKey, requiredScope)
                .flatMap(valid -> {
                    cache.put(cacheKey, valid);
                    return valid ? chain.filter(exchange) : reject(exchange);
                });
    }

    private String requiredScope(String path) {
        if (PARTNER_COURSES_PATH.equals(path)
                || (PARTNER_COURSES_PATH + "/").equals(path)) {
            return "courses:read";
        }
        if (path.startsWith(PARTNER_COURSES_PATH + "/")) {
            return "courses:read-detail";
        }
        return null;
    }

    private Mono<Void> reject(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -2;
    }
}
