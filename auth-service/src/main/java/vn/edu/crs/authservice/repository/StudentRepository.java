package vn.edu.crs.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.crs.authservice.entity.Student;

public interface StudentRepository extends JpaRepository<Student, Long> {

    boolean existsByUserId(Long userId);
}
