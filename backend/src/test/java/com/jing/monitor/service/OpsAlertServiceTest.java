package com.jing.monitor.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Sends real HTTP requests to a local fake Bark server and checks what arrives.
 */
class OpsAlertServiceTest {

    private final List<String> received = new CopyOnWriteArrayList<>();
    private HttpServer bark;
    private String barkUrl;

    @BeforeEach
    void startFakeBark() throws Exception {
        bark = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        bark.createContext("/", exchange -> {
            received.add(exchange.getRequestURI().getRawPath() + "?" + exchange.getRequestURI().getRawQuery());
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        bark.start();
        barkUrl = "http://127.0.0.1:" + bark.getAddress().getPort() + "/DEVICE_KEY/";
    }

    @AfterEach
    void stopFakeBark() {
        bark.stop(0);
    }

    @Test
    void alertIsPushedOnceWithinTheRepeatWindowAndEncodedAsPathSegments() throws Exception {
        OpsAlertService alerts = new OpsAlertService(barkUrl, 30);

        alerts.alert("crawler-failures", "MadEnroll: crawler failing", "Last: 1272:015594 (HTTP 403/blocked)");
        alerts.alert("crawler-failures", "repeat inside window", "must not be pushed");

        awaitPushes(1);
        Thread.sleep(300);
        assertThat(received).containsExactly(
                "/DEVICE_KEY/MadEnroll%3A%20crawler%20failing/Last%3A%201272%3A015594%20%28HTTP%20403%2Fblocked%29"
                        + "?level=timeSensitive&group=MadEnroll");
    }

    @Test
    void differentAlertKeysAreThrottledIndependently() throws Exception {
        OpsAlertService alerts = new OpsAlertService(barkUrl, 30);

        alerts.alert("crawler-failures", "a", "a");
        alerts.alert("scheduler-stalled", "b", "b");

        awaitPushes(2);
    }

    @Test
    void resolvePushesOnlyForAnAlertedKeyAndOnlyOnce() throws Exception {
        OpsAlertService alerts = new OpsAlertService(barkUrl, 30);

        alerts.resolve("scheduler-stalled", "never alerted", "x");
        alerts.alert("crawler-failures", "failing", "x");
        alerts.resolve("crawler-failures", "recovered", "x");
        alerts.resolve("crawler-failures", "recovered again", "x");

        awaitPushes(2);
        Thread.sleep(300);
        assertThat(received).hasSize(2);
        assertThat(received).anySatisfy(path -> assertThat(path).startsWith("/DEVICE_KEY/recovered/").endsWith("level=active&group=MadEnroll"));
    }

    @Test
    void alertCanFireAgainAfterItWasResolved() throws Exception {
        OpsAlertService alerts = new OpsAlertService(barkUrl, 30);

        alerts.alert("crawler-failures", "failing", "1");
        alerts.resolve("crawler-failures", "recovered", "x");
        alerts.alert("crawler-failures", "failing", "2");

        awaitPushes(3);
    }

    @Test
    void blankBarkUrlDisablesPushes() throws Exception {
        OpsAlertService alerts = new OpsAlertService("  ", 30);

        alerts.alert("crawler-failures", "failing", "x");

        Thread.sleep(300);
        assertThat(received).isEmpty();
    }

    private void awaitPushes(int count) throws InterruptedException {
        for (int i = 0; i < 50 && received.size() < count; i++) {
            Thread.sleep(50);
        }
        assertThat(received).hasSize(count);
    }
}
