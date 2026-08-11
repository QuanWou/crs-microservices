package vn.edu.crs.course_service.demo1.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    // Tìm kiếm và phân trang danh sách môn học
    public Page<CourseDTO> search(String keyword, Pageable pageable) {
        Page<Course> courses = (keyword == null || keyword.isBlank())
                ? courseRepository.findAll(pageable)
                : courseRepository.findByTenMonHocContainingIgnoreCase(keyword.trim(), pageable);

        return courses.map(this::toDTO);
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

    // API nội bộ dùng khi registration-service tạo đăng ký
    @Transactional
    public CourseDTO reserveSeat(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() ->
                        new NoSuchElementException("Không tìm thấy môn học có id = " + courseId));

        if (course.getSoChoConLai() <= 0) {
            throw new IllegalStateException("Môn học đã hết chỗ, không thể đăng ký");
        }

        course.setSoChoConLai(course.getSoChoConLai() - 1);
        return toDTO(courseRepository.save(course));
    }

    // API nội bộ dùng khi registration-service hủy đăng ký
    @Transactional
    public CourseDTO releaseSeat(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() ->
                        new NoSuchElementException("Không tìm thấy môn học có id = " + courseId));

        if (course.getSoChoConLai() < course.getSoChoToiDa()) {
            course.setSoChoConLai(course.getSoChoConLai() + 1);
        }

        return toDTO(courseRepository.save(course));
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
