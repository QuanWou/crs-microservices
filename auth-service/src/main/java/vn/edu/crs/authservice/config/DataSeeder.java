package vn.edu.crs.authservice.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.crs.authservice.entity.Student;
import vn.edu.crs.authservice.entity.User;
import vn.edu.crs.authservice.repository.StudentRepository;
import vn.edu.crs.authservice.repository.UserRepository;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(
            UserRepository userRepository,
            StudentRepository studentRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        createUserIfMissing("admin", "admin123", "ADMIN");
        User studentUser = createUserIfMissing("student1", "student123", "STUDENT");

        if (!studentRepository.existsByUserId(studentUser.getId())) {
            Student student = new Student();
            student.setHoTen("Sinh viên mẫu");
            student.setMssv("SV001");
            student.setUser(studentUser);
            studentRepository.save(student);
        }
    }

    private User createUserIfMissing(String username, String rawPassword, String role) {
        return userRepository.findByUsername(username).orElseGet(() -> {
            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole(role);
            return userRepository.save(user);
        });
    }
}
