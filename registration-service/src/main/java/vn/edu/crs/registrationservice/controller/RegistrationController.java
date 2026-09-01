package vn.edu.crs.registrationservice.controller;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.crs.registrationservice.dto.RegistrationRequestDTO;
import vn.edu.crs.registrationservice.entity.Registration;
import vn.edu.crs.registrationservice.service.RegistrationService;
import vn.edu.crs.registrationservice.security.JwtPrincipal;

@RestController
@RequestMapping("/registrations")
public class RegistrationController {

    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Registration register(@Valid @RequestBody RegistrationRequestDTO dto,
                                 Authentication authentication) {
        return registrationService.register(dto, currentUserId(authentication));
    }

    @GetMapping("/my")
    public java.util.List<Registration> mine(Authentication authentication) {
        return registrationService.findByStudentId(currentUserId(authentication));
    }

    @DeleteMapping("/{id}")
    public void cancel(@PathVariable Long id, Authentication authentication) {
        registrationService.cancel(id, currentUserId(authentication));
    }

    private Long currentUserId(Authentication authentication) {
        Object principal = authentication == null ? null : authentication.getPrincipal();
        if (!(principal instanceof JwtPrincipal jwtPrincipal)) {
            throw new IllegalStateException("JWT thiếu userId");
        }
        return jwtPrincipal.userId();
    }
}
