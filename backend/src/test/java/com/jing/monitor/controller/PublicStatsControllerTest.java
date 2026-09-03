package com.jing.monitor.controller;

import com.jing.monitor.service.MailCounterService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicStatsControllerTest {

    @Test
    void returnsOnlyTheAggregateMailAlertTotal() throws Exception {
        MailCounterService mailCounterService = mock(MailCounterService.class);
        when(mailCounterService.getTotalSentCount()).thenReturn(1353L);
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new PublicStatsController(mailCounterService))
                .build();

        mockMvc.perform(get("/api/public/stats/mail-alerts/total"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.totalSent").value(1353))
                .andExpect(jsonPath("$.data.*").value(org.hamcrest.Matchers.hasSize(1)));
    }
}
