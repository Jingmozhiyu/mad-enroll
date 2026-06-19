package com.jing.monitor.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jing.monitor.model.SectionInfo;
import com.jing.monitor.model.StatusMapping;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Core component responsible for fetching data from the UW-Madison Enrollment API.
 * <p>
 * Strategy:
 * 1. Uses Jsoup for lightweight HTTP requests.
 * 2. Fetches at the COURSE level (api/search/v1/enrollmentPackages/{term}/{subject}/{courseId}).
 * 3. Returns a list of all sections to reduce API call frequency.
 */
@Component
@Slf4j
public class CourseCrawler {

    @Value("${uw-api.user-agent}")
    private String userAgent;

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Fetches the real-time status of ALL sections for a specific course ID.
     *
     * @param courseId The canonical course identifier accepted by the enrollment-package endpoint.
     * @return List of SectionInfo objects, or null if fetch fails.
     */
    public List<SectionInfo> fetchCourseStatus(String termId, String subjectCode, String courseId) {
        // Construct the GET endpoint for course-level details
        String url = String.format("https://public.enroll.wisc.edu/api/search/v1/enrollmentPackages/%s/%s/%s",
                termId, subjectCode, courseId);

        try {
            Connection conn = Jsoup.connect(url)
                    .ignoreContentType(true)
                    .header("User-Agent", userAgent)
                    .header("Referer", "https://public.enroll.wisc.edu/")
                    .header("Accept", "application/json, text/plain, */*")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .header("Accept-Encoding", "gzip, deflate")
                    .header("Sec-Fetch-Dest", "empty")
                    .header("Sec-Fetch-Mode", "cors")
                    .header("Sec-Fetch-Site", "same-origin")
                    .header("sec-ch-ua", "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"")
                    .header("sec-ch-ua-mobile", "?0")
                    .header("sec-ch-ua-platform", "\"macOS\"")
                    .header("Connection", "keep-alive")
                    .method(Connection.Method.GET)
                    .timeout(15000)
                    .ignoreHttpErrors(true);

            Connection.Response response = conn.execute();

            int statusCode = response.statusCode();

            if (statusCode == 200) {
                String jsonBody = response.body();
                JsonNode rootNode = mapper.readTree(jsonBody);
                List<SectionInfo> sectionInfos = new ArrayList<>();

                if (rootNode.isArray()) {
                    for (JsonNode node : rootNode) {
                        SectionInfo info = parseSectionInfo(node, courseId);
                        if (info != null) {
                            sectionInfos.add(info);
                        }
                    }
                    return sectionInfos;
                }

                if (rootNode.isObject()) {
                    SectionInfo info = parseSectionInfo(rootNode, courseId);
                    if (info != null) {
                        sectionInfos.add(info);
                        return sectionInfos;
                    }
                }

                log.warn("[Crawler] API 200 but returned unexpected format for course: {}", courseId);
                return null;
            }

            // Handle WAF or Rate Limiting
            if (statusCode == 202 || statusCode == 403 || statusCode == 429) {
                log.warn("[Crawler] API status {} (blocked/rate limited). Skipping cycle.", statusCode);
                return null;
            }

            log.error("[Crawler] API error: {} | body: {}", statusCode, response.body());
            return null;

        } catch (IOException e) {
            log.error("[Crawler] Network error while fetching course {}", courseId, e);
        }

        return null;
    }

    private SectionInfo parseSectionInfo(JsonNode node, String fallbackCourseId) {
        String docId = node.path("docId").asText();
        String sectionId = node.path("enrollmentClassNumber").asText();
        if (docId == null || docId.isBlank() || sectionId == null || sectionId.isBlank()) {
            return null;
        }

        JsonNode representativeSectionNode = node.path("sections").isArray() && !node.path("sections").isEmpty()
                ? node.path("sections").path(0)
                : JsonNodeFactory.instance.objectNode();
        JsonNode subjectNode = representativeSectionNode.path("subject");
        JsonNode enrollmentStatusNode = node.path("enrollmentStatus");
        JsonNode packageStatusNode = node.path("packageEnrollmentStatus");

        Integer openSeats = nullableInt(enrollmentStatusNode, "openSeats");
        Integer capacity = nullableInt(enrollmentStatusNode, "capacity");
        Integer waitlistSeats = nullableInt(enrollmentStatusNode, "openWaitlistSpots");
        Integer waitlistCapacity = nullableInt(enrollmentStatusNode, "waitlistCapacity");

        return new SectionInfo(
                node.path("termCode").asText(),
                node.path("courseId").asText(fallbackCourseId),
                docId,
                sectionId,
                node.path("subjectCode").asText(subjectNode.path("subjectCode").asText()),
                subjectNode.path("shortDescription").asText(),
                node.path("catalogNumber").asText(representativeSectionNode.path("catalogNumber").asText()),
                parseStatus(packageStatusNode.path("status").asText(), openSeats, waitlistSeats),
                openSeats,
                capacity,
                waitlistSeats,
                waitlistCapacity,
                node.path("onlineOnly").asBoolean(false),
                buildMeetingInfo(node.path("classMeetings"))
        );
    }

    private StatusMapping parseStatus(String rawStatus, Integer openSeats, Integer waitlistSeats) {
        if (rawStatus != null && !rawStatus.isBlank()) {
            try {
                return StatusMapping.valueOf(rawStatus);
            } catch (Exception ignored) {
                // Fall through to numeric inference.
            }
        }

        if (openSeats != null && openSeats > 0) {
            return StatusMapping.OPEN;
        }
        if (waitlistSeats != null && waitlistSeats > 0) {
            return StatusMapping.WAITLISTED;
        }
        return StatusMapping.CLOSED;
    }

    private Integer nullableInt(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        JsonNode valueNode = node.path(fieldName);
        if (valueNode.isMissingNode() || valueNode.isNull()) {
            return null;
        }
        return valueNode.asInt();
    }

    private String buildMeetingInfo(JsonNode classMeetingsNode) {
        ArrayNode result = mapper.createArrayNode();
        if (classMeetingsNode != null && classMeetingsNode.isArray()) {
            for (JsonNode meetingNode : classMeetingsNode) {
                if (!"CLASS".equalsIgnoreCase(meetingNode.path("meetingType").asText())) {
                    continue;
                }
                ObjectNode payload = mapper.createObjectNode();
                payload.put("meetingDays", meetingNode.path("meetingDays").asText());
                if (!meetingNode.path("meetingTimeStart").isMissingNode() && !meetingNode.path("meetingTimeStart").isNull()) {
                    payload.put("meetingTimeStart", meetingNode.path("meetingTimeStart").asLong());
                } else {
                    payload.putNull("meetingTimeStart");
                }
                if (!meetingNode.path("meetingTimeEnd").isMissingNode() && !meetingNode.path("meetingTimeEnd").isNull()) {
                    payload.put("meetingTimeEnd", meetingNode.path("meetingTimeEnd").asLong());
                } else {
                    payload.putNull("meetingTimeEnd");
                }
                JsonNode buildingNode = meetingNode.path("building");
                if (!buildingNode.isMissingNode() && !buildingNode.path("buildingName").isMissingNode() && !buildingNode.path("buildingName").isNull()) {
                    payload.put("buildingName", buildingNode.path("buildingName").asText());
                } else {
                    payload.putNull("buildingName");
                }
                if (!meetingNode.path("room").isMissingNode() && !meetingNode.path("room").isNull()) {
                    payload.put("room", meetingNode.path("room").asText());
                } else {
                    payload.putNull("room");
                }
                result.add(payload);
            }
        }
        return result.toString();
    }

    /**
     * Executes keyword search against the UW enrollment search endpoint.
     *
     * @param userQueryString user input query such as "COMP SCI 577"
     * @return parsed search response JSON, or {@code null} when request fails
     */
    public JsonNode searchCourse(String userQueryString, String termId, int page) {
        String searchUrl = "https://public.enroll.wisc.edu/api/search/v1";

        try {
            ObjectNode root = mapper.createObjectNode();
            root.put("selectedTerm", termId);
            root.put("queryString", userQueryString); // "COMP SCI 571"
            root.put("page", page);
            root.put("pageSize", 50);
            root.put("sortOrder", "SCORE");

            ArrayNode filters = root.putArray("filters");
            ObjectNode hasChild = filters.addObject().putObject("has_child");
            hasChild.put("type", "enrollmentPackage");

            ObjectNode query = hasChild.putObject("query");
            ObjectNode bool = query.putObject("bool");
            ArrayNode must = bool.putArray("must");

            // match 1: status
            must.addObject().putObject("match")
                    .put("packageEnrollmentStatus.status", "OPEN WAITLISTED CLOSED");

            // match 2: published
            must.addObject().putObject("match")
                    .put("published", true);

            // Convert to string and ready to be sent
            String jsonPayload = mapper.writeValueAsString(root);

            // POST Request
            Connection.Response response = Jsoup.connect(searchUrl)
                    .header("Content-Type", "application/json")
                    .header("User-Agent", userAgent)
                    .header("Referer", "https://public.enroll.wisc.edu/")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .header("Accept-Encoding", "gzip, deflate")
                    .header("Sec-Fetch-Dest", "empty")
                    .header("Sec-Fetch-Mode", "cors")
                    .header("Sec-Fetch-Site", "same-origin")
                    .header("sec-ch-ua", "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"")
                    .header("sec-ch-ua-mobile", "?0")
                    .header("sec-ch-ua-platform", "\"macOS\"")
                    .header("Connection", "keep-alive")
                    .ignoreContentType(true)
                    .timeout(10000)
                    .method(Connection.Method.POST)
                    .requestBody(jsonPayload)       // Put JSON into request body
                    .execute();

            // Handle response
            if (response.statusCode() == 200) {
                return mapper.readTree(response.body());
            } else {
                log.warn("[Crawler] Search failed with status: {}", response.statusCode());
                return null;
            }

        } catch (Exception e) {
            log.error("[Crawler] Network error during search for query: {}", userQueryString, e);
            return null;
        }
    }
}
