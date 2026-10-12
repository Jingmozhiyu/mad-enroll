package com.jing.monitor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.CourseSectionRepository;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Course search and its two-minute "course not found" cache.
 */
@SuppressWarnings("unchecked")
class SubscriptionServiceSearchTest {

    private final CourseCrawler crawler = mock(CourseCrawler.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final ValueOperations<String, String> values = mock(ValueOperations.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private SubscriptionService service;

    @BeforeEach
    void setUp() {
        when(redis.opsForValue()).thenReturn(values);
        when(redis.hasKey(anyString())).thenReturn(false);
        service = new SubscriptionService(crawler, mock(CourseRepository.class), mock(CourseSectionRepository.class),
                mock(UserSectionSubscriptionRepository.class), mock(UserRepository.class),
                mock(AuthContextService.class), redis, mock(TermService.class));
    }

    @Test
    void upstreamFailureIsReportedAndNeverCachedAsAMiss() {
        when(crawler.searchCourse("COMP SCI 240", "1272", 1)).thenReturn(null);

        assertThatThrownBy(() -> service.searchCourse("COMP SCI 240", "1272", 1))
                .hasMessageContaining("temporarily unavailable");
        verify(values, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void realMissIsCachedForTwoMinutes() throws Exception {
        when(crawler.searchCourse("NOPE 999", "1272", 1)).thenReturn(mapper.readTree("{\"found\":0,\"hits\":[]}"));

        assertThatThrownBy(() -> service.searchCourse("NOPE 999", "1272", 1)).hasMessageContaining("Course not found");
        verify(values).set(eq("search:miss:1272:1:nope 999"), eq("1"), eq(Duration.ofMinutes(2)));
    }

    @Test
    void cachedMissSkipsTheCrawler() {
        when(redis.hasKey("search:miss:1272:1:nope 999")).thenReturn(true);

        assertThatThrownBy(() -> service.searchCourse("  NOPE   999 ", "1272", 1)).hasMessageContaining("Course not found");
        verifyNoInteractions(crawler);
    }

    @Test
    void hitsAreMappedToCourseResults() throws Exception {
        when(crawler.searchCourse("COMP SCI 240", "1272", 1)).thenReturn(mapper.readTree("""
                {"found":1,"hits":[{"courseDesignation":"COMP SCI 240","title":"Discrete Mathematics",
                  "subject":{"subjectCode":"266"},"courseId":"011630"}]}
                """));

        assertThat(service.searchCourse("COMP SCI 240", "1272", 1)).singleElement().satisfies(hit -> {
            assertThat(hit.getCourseDesignation()).isEqualTo("COMP SCI 240");
            assertThat(hit.getSubjectId()).isEqualTo("266");
            assertThat(hit.getCourseId()).isEqualTo("011630");
        });
    }
}
