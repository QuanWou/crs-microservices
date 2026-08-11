package vn.edu.crs.registrationservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegistrationRequestDTO {

    @NotNull(message = "studentId không được để trống")
    private Long studentId;

    @NotNull(message = "courseId không được để trống")
    private Long courseId;
}
