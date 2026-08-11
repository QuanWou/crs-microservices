package vn.edu.crs.registrationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.edu.crs.registrationservice.client.CourseClient;
import vn.edu.crs.registrationservice.dto.RegistrationRequestDTO;
import vn.edu.crs.registrationservice.entity.Registration;
import vn.edu.crs.registrationservice.repository.RegistrationRepository;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private static final String DA_DANG_KY = "DA_DANG_KY";
    private static final String DA_HUY = "DA_HUY";

    private final RegistrationRepository registrationRepository;
    private final CourseClient courseClient;

    public Registration register(RegistrationRequestDTO dto) {
        boolean alreadyRegistered =
                registrationRepository.existsByStudentIdAndCourseIdAndTrangThai(
                        dto.getStudentId(),
                        dto.getCourseId(),
                        DA_DANG_KY
                );

        if (alreadyRegistered) {
            throw new IllegalStateException("Sinh viên đã đăng ký môn học này rồi");
        }

        // Chỉ lưu đăng ký sau khi course-service xác nhận đã giữ chỗ thành công.
        courseClient.reserveSeat(dto.getCourseId());

        Registration registration = new Registration();
        registration.setStudentId(dto.getStudentId());
        registration.setCourseId(dto.getCourseId());
        registration.setTrangThai(DA_DANG_KY);
        registration.setNgayDangKy(LocalDateTime.now());

        return registrationRepository.save(registration);
    }

    public void cancel(Long registrationId) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Không tìm thấy đăng ký có id = " + registrationId));

        if (DA_HUY.equals(registration.getTrangThai())) {
            throw new IllegalStateException("Đăng ký này đã được hủy trước đó");
        }

        // Chỉ đổi trạng thái sau khi course-service xác nhận đã hoàn chỗ.
        courseClient.releaseSeat(registration.getCourseId());
        registration.setTrangThai(DA_HUY);
        registrationRepository.save(registration);
    }
}
