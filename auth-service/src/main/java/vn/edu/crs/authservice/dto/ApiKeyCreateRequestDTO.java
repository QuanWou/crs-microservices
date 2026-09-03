package vn.edu.crs.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public class ApiKeyCreateRequestDTO {

    @NotBlank(message = "Tên đối tác không được để trống")
    private String ownerName;

    @NotBlank(message = "Danh sách scope không được để trống")
    private String scopes;

    @Positive(message = "Số ngày hiệu lực phải lớn hơn 0")
    private Integer validDays;

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public String getScopes() { return scopes; }
    public void setScopes(String scopes) { this.scopes = scopes; }
    public Integer getValidDays() { return validDays; }
    public void setValidDays(Integer validDays) { this.validDays = validDays; }
}
