package com.jing.monitor.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pushes operator alerts to the admin's phone through Bark.
 * <p>
 * Each alert has a key. While a key stays active, it is pushed at most once per repeat window;
 * {@link #resolve} pushes one recovery notice for a key that was alerted. Pushes are asynchronous
 * and never throw, so a Bark outage cannot affect polling. Alerts are disabled when {@code BARK_URL}
 * is not set.
 */
@Service
@Slf4j
public class OpsAlertService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final Map<String, Instant> lastPushedAtByKey = new ConcurrentHashMap<>();
    private final String barkUrl;
    private final Duration repeatWindow;

    /**
     * @param barkUrl Bark device URL such as {@code https://api.day.app/<device key>}; blank disables alerts
     * @param repeatMinutes minimum minutes between two pushes of the same active alert
     */
    public OpsAlertService(
            @Value("${app.ops-alert.bark-url:}") String barkUrl,
            @Value("${app.ops-alert.repeat-minutes:30}") long repeatMinutes
    ) {
        this.barkUrl = barkUrl == null ? "" : barkUrl.trim().replaceAll("/+$", "");
        this.repeatWindow = Duration.ofMinutes(Math.max(repeatMinutes, 1));
        if (this.barkUrl.isEmpty()) {
            log.warn("[OpsAlert] BARK_URL is not set; operator alerts are disabled.");
        }
    }

    /**
     * Raises or repeats an alert. Pushes when the key was not pushed within the repeat window.
     *
     * @param key stable alert identifier, e.g. "crawler-failures"
     * @param title push title
     * @param body push body
     */
    public void alert(String key, String title, String body) {
        Instant now = Instant.now();
        Instant last = lastPushedAtByKey.get(key);
        if (last != null && last.plus(repeatWindow).isAfter(now)) {
            return;
        }
        lastPushedAtByKey.put(key, now);
        log.error("[OpsAlert] {}: {} | {}", key, title, body);
        push(title, body, "timeSensitive");
    }

    /**
     * Clears an alert. Pushes a recovery notice only if this key had been alerted.
     *
     * @param key alert identifier passed to {@link #alert}
     * @param title push title
     * @param body push body
     */
    public void resolve(String key, String title, String body) {
        if (lastPushedAtByKey.remove(key) == null) {
            return;
        }
        log.info("[OpsAlert] {} resolved: {} | {}", key, title, body);
        push(title, body, "active");
    }

    private void push(String title, String body, String level) {
        if (barkUrl.isEmpty()) {
            return;
        }
        URI uri = URI.create(barkUrl + "/" + encode(title) + "/" + encode(body)
                + "?level=" + level + "&group=MadEnroll");
        HttpRequest request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10)).GET().build();
        httpClient.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                .whenComplete((response, error) -> {
                    if (error != null) {
                        log.error("[OpsAlert] Bark push failed", error);
                    } else if (response.statusCode() != 200) {
                        log.error("[OpsAlert] Bark push returned HTTP {}", response.statusCode());
                    }
                });
    }

    private String encode(String value) {
        // Path segments: encode spaces as %20 and slashes as %2F so Bark reads one segment each.
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
