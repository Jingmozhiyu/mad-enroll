package com.jing.monitor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main Spring Boot entry point for the course monitoring application.
 * <p>
 * Scheduling is enabled globally so polling jobs can run in the background.
 */
@SpringBootApplication
@EnableScheduling
@EnableRabbit
public class MonitorApplication {

    /**
     * Boots the Spring application context.
     *
     * @param args command-line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(MonitorApplication.class, args);
    }
}
