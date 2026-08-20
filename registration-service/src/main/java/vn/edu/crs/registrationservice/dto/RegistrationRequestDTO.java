package vn.edu.crs.registrationservice.dto;

import jakarta.validation.constraints.NotNull;

public class RegistrationRequestDTO {

    @NotNull(message = "studentId không được để trống")
    private Long studentId;

    @NotNull(message = "courseId không được để trống")
    private Long courseId;

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }
}
