package com.nextmail;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@EnableJpaRepositories(basePackages = {"com.nextmail.auth", "com.nextmail.mail", "com.nextmail.thread"})
public class NextMailApplication {

    public static void main(String[] args) {
        SpringApplication.run(NextMailApplication.class, args);
    }
}
