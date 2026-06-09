package com.chat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.io.File;

@SpringBootApplication
@EnableScheduling
public class ChatApplication {
    private static final Logger log = LoggerFactory.getLogger(ChatApplication.class);

    public static void main(String[] args) {
        File dataDir = new File("./data");
        if (!dataDir.exists()) {
            dataDir.mkdirs();
        }
        SpringApplication.run(ChatApplication.class, args);
    }

    @Bean
    CommandLineRunner logEndpoints(RequestMappingHandlerMapping mapping) {
        return args -> {
            log.info("========== REGISTERED ENDPOINTS ==========");
            mapping.getHandlerMethods().forEach((key, value) ->
                log.info("ENDPOINT: {} -> {}", key, value));
            log.info("========== END ENDPOINTS ==========");
        };
    }
}
