package com.jing.monitor.model.dto;

import com.jing.monitor.model.AcademicTerm;

public record AdminTermUpdateRespDto(AcademicTerm term, int disabledSubscriptions) {}
