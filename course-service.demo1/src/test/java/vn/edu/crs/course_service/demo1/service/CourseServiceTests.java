package vn.edu.crs.course_service.demo1.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import vn.edu.crs.course_service.demo1.dto.CourseDTO;
import vn.edu.crs.course_service.demo1.entity.Course;
import vn.edu.crs.course_service.demo1.repository.CourseRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseServiceTests {

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private CourseService courseService;

    @Test
    void searchUsesKeywordAndMapsPageToDto() {
        PageRequest pageable = PageRequest.of(0, 5);
        Course course = course(1L, "Lập trình Java", 30, 12);
        when(courseRepository.findByTenMonHocContainingIgnoreCase("java", pageable))
                .thenReturn(new PageImpl<>(List.of(course), pageable, 1));

        Page<CourseDTO> result = courseService.search(" java ", pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().getFirst().getTenMonHoc()).isEqualTo("Lập trình Java");
    }

    @Test
    void searchWithoutKeywordUsesFindAll() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(courseRepository.findAll(pageable)).thenReturn(Page.empty(pageable));

        courseService.search("  ", pageable);

        verify(courseRepository).findAll(pageable);
    }

    @Test
    void reserveSeatDecreasesAvailableSeats() {
        Course course = course(1L, "Kiến trúc phần mềm", 20, 1);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(courseRepository.save(course)).thenReturn(course);

        CourseDTO result = courseService.reserveSeat(1L);

        assertThat(result.getSoChoConLai()).isZero();
        verify(courseRepository).save(course);
    }

    @Test
    void reserveSeatRejectsFullCourse() {
        Course course = course(1L, "Kiến trúc phần mềm", 20, 0);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> courseService.reserveSeat(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("hết chỗ");
    }

    @Test
    void releaseSeatDoesNotExceedMaximum() {
        Course course = course(1L, "Kiến trúc phần mềm", 20, 20);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(courseRepository.save(course)).thenReturn(course);

        CourseDTO result = courseService.releaseSeat(1L);

        assertThat(result.getSoChoConLai()).isEqualTo(20);
    }

    private Course course(Long id, String name, int maximumSeats, int availableSeats) {
        return new Course(id, name, 3, maximumSeats, availableSeats);
    }
}
