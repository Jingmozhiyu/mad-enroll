package com.jing.monitor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "terms")
@Data
@NoArgsConstructor
public class AcademicTerm {
    @Id
    @Column(name = "term_code", length = 4, nullable = false, updatable = false)
    private String code;

    @Column(nullable = false, length = 80)
    private String label;

    @Column(name = "is_default", nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("isDefault")
    private boolean defaultTerm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TermStatus status = TermStatus.UPCOMING;

    public AcademicTerm(String code, String label) {
        this.code = code;
        this.label = label;
    }
}
