package com.jing.monitor.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

import java.util.concurrent.ThreadPoolExecutor;

/**
 * Explicit scheduler configuration so slow crawler/database work cannot block
 * every other scheduled task behind Spring's default single-thread scheduler.
 */
@Configuration
@Slf4j
public class SchedulingConfig implements SchedulingConfigurer {

    @Value("${monitor.scheduler.pool-size:4}")
    private int schedulerPoolSize;

    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(Math.max(2, schedulerPoolSize));
        scheduler.setThreadNamePrefix("monitor-scheduler-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(30);
        scheduler.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        scheduler.setErrorHandler(throwable -> log.error("[Scheduler] Unhandled exception escaped a scheduled task.", throwable));
        return scheduler;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.setTaskScheduler(taskScheduler());
    }
}
