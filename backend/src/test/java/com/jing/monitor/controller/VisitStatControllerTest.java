package com.jing.monitor.controller;

import com.jing.monitor.model.VisitStat;
import com.jing.monitor.repository.VisitStatRepository;
import com.jing.monitor.service.VisitStatService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class VisitStatControllerTest {

    @Test
    void recordsVisitorAddressInsteadOfCaddyAddress() {
        MockHttpServletRequest request = visitRequest();
        request.addHeader("X-Forwarded-For", "198.51.100.7");
        request.addHeader("X-Client-IP", "192.0.2.99");

        assertThat(recordVisit(request).getIp()).isEqualTo("198.51.100.7");
    }

    @Test
    void recordsIpv6AndTrimsProxyChain() {
        MockHttpServletRequest request = visitRequest();
        request.addHeader("X-Forwarded-For", " 2001:db8::1234 , 172.18.0.5");

        assertThat(recordVisit(request).getIp()).isEqualTo("2001:db8::1234");
    }

    @Test
    void directRequestsUseRemoteAddress() {
        MockHttpServletRequest request = visitRequest();
        request.setRemoteAddr("203.0.113.9");

        VisitStat stat = recordVisit(request);

        assertThat(stat.getIp()).isEqualTo("203.0.113.9");
        assertThat(stat.getVisitedAt()).isNotNull();
    }

    @Test
    void emptyForwardedAddressFallsBackToRemoteAddress() {
        MockHttpServletRequest request = visitRequest();
        request.addHeader("X-Forwarded-For", "   ");

        assertThat(recordVisit(request).getIp()).isEqualTo("172.18.0.5");
    }

    private MockHttpServletRequest visitRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/visit/mysite");
        request.setRemoteAddr("172.18.0.5");
        return request;
    }

    private VisitStat recordVisit(MockHttpServletRequest request) {
        VisitStatRepository repository = mock(VisitStatRepository.class);
        VisitStatController controller = new VisitStatController(new VisitStatService(repository));
        controller.visitFromPersonalWebsite(request);
        ArgumentCaptor<VisitStat> saved = ArgumentCaptor.forClass(VisitStat.class);
        verify(repository).save(saved.capture());
        return saved.getValue();
    }
}
