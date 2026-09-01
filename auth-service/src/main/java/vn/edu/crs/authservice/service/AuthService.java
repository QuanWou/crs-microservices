package vn.edu.crs.authservice.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.edu.crs.authservice.dto.LoginRequestDTO;
import vn.edu.crs.authservice.dto.LoginResponseDTO;
import vn.edu.crs.authservice.entity.User;
import vn.edu.crs.authservice.exception.InvalidCredentialsException;
import vn.edu.crs.authservice.repository.UserRepository;
import vn.edu.crs.authservice.security.JwtUtil;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public LoginResponseDTO login(LoginRequestDTO dto) {
        User user = userRepository.findByUsername(dto.getUsername())
                .orElseThrow(() -> new InvalidCredentialsException(
                        "Sai username hoặc password"));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Sai username hoặc password");
        }

        // The two-argument overload remains compatible with earlier labs; the
        // pending id makes the emitted JWT carry the authenticated user's id.
        jwtUtil.setUserIdForNextToken(user.getId());
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return new LoginResponseDTO(token, user.getId(), user.getUsername(), user.getRole());
    }
}
