package vn.edu.crs.course_service.demo1.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.edu.crs.course_service.demo1.dto.CourseDTO;
import vn.edu.crs.course_service.demo1.entity.Course;
import vn.edu.crs.course_service.demo1.repository.CourseRepository;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;

    // Lấy danh sách
    public List<CourseDTO> getAll() {
        return courseRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Lấy theo ID
    public CourseDTO getById(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() ->
                        new NoSuchElementException("Không tìm thấy môn học có id = " + id));

        return toDTO(course);
    }

    // Thêm mới
    public CourseDTO create(CourseDTO dto) {

        if (courseRepository.existsByTenMonHocIgnoreCase(dto.getTenMonHoc())) {
            throw new IllegalArgumentException("Tên môn học đã tồn tại");
        }

        Course course = new Course();

        course.setTenMonHoc(dto.getTenMonHoc());
        course.setSoTinChi(dto.getSoTinChi());
        course.setSoChoToiDa(dto.getSoChoToiDa());

        // Khi tạo mới thì số chỗ còn lại = số chỗ tối đa
        course.setSoChoConLai(dto.getSoChoToiDa());

        return toDTO(courseRepository.save(course));
    }

    // Cập nhật
    public CourseDTO update(Long id, CourseDTO dto) {

        Course course = courseRepository.findById(id)
                .orElseThrow(() ->
                        new NoSuchElementException("Không tìm thấy môn học có id = " + id));

        course.setTenMonHoc(dto.getTenMonHoc());
        course.setSoTinChi(dto.getSoTinChi());
        course.setSoChoToiDa(dto.getSoChoToiDa());

        // Không sửa soChoConLai ở đây

        return toDTO(courseRepository.save(course));
    }

    // Xóa
    public void delete(Long id) {

        if (!courseRepository.existsById(id)) {
            throw new NoSuchElementException("Không tìm thấy môn học có id = " + id);
        }

        courseRepository.deleteById(id);
    }

    // Entity -> DTO
    private CourseDTO toDTO(Course course) {

        return new CourseDTO(
                course.getId(),
                course.getTenMonHoc(),
                course.getSoTinChi(),
                course.getSoChoToiDa(),
                course.getSoChoConLai()
        );
    }

}