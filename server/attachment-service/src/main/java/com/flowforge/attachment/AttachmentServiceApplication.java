package com.flowforge.attachment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AttachmentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AttachmentServiceApplication.class, args);
    }
}
