package vn.edu.crs.registrationservice.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

@Component
public class CourseClient {

    private final RestTemplate restTemplate;

    @Value("${course-service.base-url}")
    private String courseServiceBaseUrl;

    public CourseClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public void reserveSeat(Long courseId) {
        exchangeSeatCommand(courseId, "reserve-seat");
    }

    public void releaseSeat(Long courseId) {
        exchangeSeatCommand(courseId, "release-seat");
    }

    private void exchangeSeatCommand(Long courseId, String command) {
        String url = courseServiceBaseUrl
                + "/internal/courses/" + courseId + "/" + command;

        try {
            restTemplate.exchange(url, HttpMethod.PATCH, HttpEntity.EMPTY, Void.class);
        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode().value() == 404) {
                throw new IllegalStateException("Môn học không tồn tại", ex);
            }
            if (ex.getStatusCode().value() == 409) {
                throw new IllegalStateException("Môn học đã hết chỗ", ex);
            }
            throw new IllegalStateException("Course-service từ chối yêu cầu", ex);
        } catch (HttpServerErrorException | ResourceAccessException ex) {
            throw new IllegalStateException(
                    "Không thể kết nối tới course-service, vui lòng thử lại sau",
                    ex
            );
        }
    }
}
