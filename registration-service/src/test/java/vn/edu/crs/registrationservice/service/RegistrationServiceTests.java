package vn.edu.crs.registrationservice.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.crs.registrationservice.client.CourseClient;
import vn.edu.crs.registrationservice.dto.RegistrationRequestDTO;
import vn.edu.crs.registrationservice.entity.Registration;
import vn.edu.crs.registrationservice.repository.RegistrationRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegistrationServiceTests {

    @Mock
    private RegistrationRepository registrationRepository;

    @Mock
    private CourseClient courseClient;

    @InjectMocks
    private RegistrationService registrationService;

    @Test
    void registerReservesSeatBeforeSaving() {
        RegistrationRequestDTO dto = request(10L, 20L);
        when(registrationRepository.existsByStudentIdAndCourseIdAndTrangThai(
                10L, 20L, "DA_DANG_KY")).thenReturn(false);
        when(registrationRepository.save(any(Registration.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Registration result = registrationService.register(dto);

        verify(courseClient).reserveSeat(20L);
        assertThat(result.getStudentId()).isEqualTo(10L);
        assertThat(result.getCourseId()).isEqualTo(20L);
        assertThat(result.getTrangThai()).isEqualTo("DA_DANG_KY");
        assertThat(result.getNgayDangKy()).isNotNull();
    }

    @Test
    void duplicateRegistrationIsRejectedBeforeCallingCourseService() {
        RegistrationRequestDTO dto = request(10L, 20L);
        when(registrationRepository.existsByStudentIdAndCourseIdAndTrangThai(
                10L, 20L, "DA_DANG_KY")).thenReturn(true);

        assertThatThrownBy(() -> registrationService.register(dto))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("đã đăng ký");

        verify(courseClient, never()).reserveSeat(any());
        verify(registrationRepository, never()).save(any());
    }

    @Test
    void cancelReleasesSeatAndChangesStatus() {
        Registration registration = new Registration(
                1L, 10L, 20L, "DA_DANG_KY", LocalDateTime.now());
        when(registrationRepository.findById(1L)).thenReturn(Optional.of(registration));
        when(registrationRepository.save(registration)).thenReturn(registration);

        registrationService.cancel(1L);

        verify(courseClient).releaseSeat(20L);
        assertThat(registration.getTrangThai()).isEqualTo("DA_HUY");
        verify(registrationRepository).save(registration);
    }

    @Test
    void cancelledRegistrationCannotReleaseSeatAgain() {
        Registration registration = new Registration(
                1L, 10L, 20L, "DA_HUY", LocalDateTime.now());
        when(registrationRepository.findById(1L)).thenReturn(Optional.of(registration));

        assertThatThrownBy(() -> registrationService.cancel(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("đã được hủy");

        verify(courseClient, never()).releaseSeat(any());
        verify(registrationRepository, never()).save(any());
    }

    private RegistrationRequestDTO request(Long studentId, Long courseId) {
        RegistrationRequestDTO dto = new RegistrationRequestDTO();
        dto.setStudentId(studentId);
        dto.setCourseId(courseId);
        return dto;
    }
}
