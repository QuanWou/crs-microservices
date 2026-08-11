package vn.edu.crs.registrationservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "registration")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Registration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    // Course thuộc database của service khác nên chỉ lưu ID, không dùng @ManyToOne.
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "trang_thai", nullable = false, length = 20)
    private String trangThai;

    @Column(name = "ngay_dang_ky", nullable = false)
    private LocalDateTime ngayDangKy;
}
