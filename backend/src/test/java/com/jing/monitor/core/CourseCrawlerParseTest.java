package com.jing.monitor.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jing.monitor.model.SectionInfo;
import com.jing.monitor.model.StatusMapping;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Parses enrollment-package JSON without network access.
 * The fixture is a real UW response for COMP SCI 240 (term 1264), saved from the API.
 */
class CourseCrawlerParseTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final CourseCrawler crawler = new CourseCrawler();
    private ObjectNode realPackage;

    @BeforeEach
    void loadFixture() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/fixtures/enrollment-package-cs240.json")) {
            realPackage = (ObjectNode) mapper.readTree(in);
        }
    }

    @Test
    void realPackageMapsIdentityStatusAndSeats() throws Exception {
        List<SectionInfo> infos = crawler.parseCourseStatus(realPackage.toString(), "fallback");

        assertThat(infos).singleElement().satisfies(info -> {
            assertThat(info.getDocId()).isEqualTo("1264-A1-266-240-002-330");
            assertThat(info.getSectionId()).isEqualTo("66400");
            assertThat(info.getTermCode()).isEqualTo("1264");
            assertThat(info.getCourseId()).isEqualTo("011630");
            assertThat(info.getSubjectId()).isEqualTo("266");
            assertThat(info.getSubjectShortName()).isEqualTo("COMP SCI");
            assertThat(info.getCatalogNumber()).isEqualTo("240");
            assertThat(info.getCourseDisplayName()).isEqualTo("COMP SCI 240");
            assertThat(info.getStatus()).isEqualTo(StatusMapping.OPEN);
            assertThat(info.getOpenSeats()).isEqualTo(7);
            assertThat(info.getCapacity()).isEqualTo(24);
            assertThat(info.getWaitlistSeats()).isEqualTo(3);
            assertThat(info.getWaitlistCapacity()).isEqualTo(3);
            assertThat(info.isOnlineOnly()).isFalse();
        });
    }

    @Test
    void meetingInfoKeepsClassMeetingsAndDropsExams() throws Exception {
        String meetingInfo = crawler.parseCourseStatus(realPackage.toString(), "fallback").getFirst().getMeetingInfo();

        JsonNode meetings = mapper.readTree(meetingInfo);
        assertThat(meetings).hasSize(2);
        assertThat(meetings.get(0).path("meetingDays").asText()).isEqualTo("M");
        assertThat(meetings.get(0).path("meetingTimeStart").asLong()).isEqualTo(81300000L);
        assertThat(meetings.get(0).path("buildingName").asText()).isEqualTo("Van Vleck Hall");
        assertThat(meetings.get(0).path("room").asText()).isEqualTo("B203");
        assertThat(meetings.get(1).path("meetingDays").asText()).isEqualTo("TR");
    }

    @Test
    void arrayResponseReturnsEveryPackageAndSkipsPackagesWithoutDocId() throws Exception {
        ObjectNode otherLecture = realPackage.deepCopy();
        otherLecture.put("docId", "1264-A1-266-240-001-330");
        ObjectNode broken = realPackage.deepCopy();
        broken.remove("docId");
        ArrayNode array = mapper.createArrayNode().add(realPackage).add(otherLecture).add(broken);

        List<SectionInfo> infos = crawler.parseCourseStatus(array.toString(), "fallback");

        // Both packages share class number 66400 but stay distinct by docId.
        assertThat(infos).extracting(SectionInfo::getDocId)
                .containsExactly("1264-A1-266-240-002-330", "1264-A1-266-240-001-330");
        assertThat(infos).extracting(SectionInfo::getSectionId).containsOnly("66400");
    }

    @ParameterizedTest(name = "openSeats={0}, waitlistSpots={1} -> {2}")
    @CsvSource({"3, 0, OPEN", "0, 2, WAITLISTED", "0, 0, CLOSED"})
    void statusIsInferredFromSeatsWhenUwOmitsIt(int openSeats, int waitlistSpots, StatusMapping expected) throws Exception {
        realPackage.remove("packageEnrollmentStatus");
        ObjectNode seats = (ObjectNode) realPackage.path("enrollmentStatus");
        seats.put("openSeats", openSeats);
        seats.put("openWaitlistSpots", waitlistSpots);

        assertThat(crawler.parseCourseStatus(realPackage.toString(), "fallback").getFirst().getStatus())
                .isEqualTo(expected);
    }

    @Test
    void unknownStatusTextFallsBackToSeatInference() throws Exception {
        ((ObjectNode) realPackage.path("packageEnrollmentStatus")).put("status", "SOMETHING_NEW");
        ObjectNode seats = (ObjectNode) realPackage.path("enrollmentStatus");
        seats.put("openSeats", 0);
        seats.put("openWaitlistSpots", 0);

        assertThat(crawler.parseCourseStatus(realPackage.toString(), "fallback").getFirst().getStatus())
                .isEqualTo(StatusMapping.CLOSED);
    }

    @Test
    void missingSeatNumbersStayNull() throws Exception {
        realPackage.remove("enrollmentStatus");

        SectionInfo info = crawler.parseCourseStatus(realPackage.toString(), "fallback").getFirst();

        assertThat(info.getOpenSeats()).isNull();
        assertThat(info.getWaitlistSeats()).isNull();
        assertThat(info.getStatus()).isEqualTo(StatusMapping.OPEN);
    }

    @Test
    void unusableBodiesReturnNull() throws Exception {
        ObjectNode noDocId = realPackage.deepCopy();
        noDocId.remove("docId");

        assertThat(crawler.parseCourseStatus("\"maintenance\"", "fallback")).isNull();
        assertThat(crawler.parseCourseStatus(noDocId.toString(), "fallback")).isNull();
        assertThat(crawler.parseCourseStatus("[]", "fallback")).isEmpty();
    }
}
