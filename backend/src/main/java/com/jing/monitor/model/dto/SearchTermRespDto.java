package com.jing.monitor.model.dto;

import com.jing.monitor.model.TermStatus;

public record SearchTermRespDto(String code, String label, TermStatus status, boolean isDefault) {}
