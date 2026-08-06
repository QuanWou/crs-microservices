package vn.edu.crs.course_service.demo1.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.crs.course_service.demo1.entity.Course;

public interface CourseRepository extends JpaRepository<Course, Long> {

    boolean existsByTenMonHocIgnoreCase(String tenMonHoc);

}