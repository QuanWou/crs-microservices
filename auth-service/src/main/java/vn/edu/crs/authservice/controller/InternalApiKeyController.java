package vn.edu.crs.authservice.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.crs.authservice.service.ApiKeyService;

import java.util.Map;

@RestController
@RequestMapping("/internal/api-keys")
public class InternalApiKeyController {

    private final ApiKeyService apiKeyService;

    public InternalApiKeyController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @GetMapping("/validate")
    public Map<String, Boolean> validate(
            @RequestParam String key,
            @RequestParam String scope) {
        return Map.of("valid", apiKeyService.isValidForScope(key, scope));
    }
}
