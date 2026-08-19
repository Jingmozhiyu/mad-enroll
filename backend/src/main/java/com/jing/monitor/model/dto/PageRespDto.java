package com.jing.monitor.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * Stable API response for one page of admin data.
 *
 * @param <T> row DTO type
 */
@Data
@AllArgsConstructor
public class PageRespDto<T> {
    private List<T> items;
    private int page;
    private int pageSize;
    private long totalItems;
    private int totalPages;
}
