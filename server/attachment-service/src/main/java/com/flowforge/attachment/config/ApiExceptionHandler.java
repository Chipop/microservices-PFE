package com.flowforge.attachment.config;

import com.azure.storage.blob.models.BlobStorageException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException exc) {
        var status = HttpStatus.valueOf(exc.getStatusCode().value());
        return ResponseEntity.status(status).body(body(status, exc.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exc) {
        var errors = new LinkedHashMap<String, String>();
        for (FieldError error : exc.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        var body = body(HttpStatus.BAD_REQUEST, "Validation failed");
        body.put("errors", errors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler({
            MissingServletRequestPartException.class,
            MissingServletRequestParameterException.class,
            MaxUploadSizeExceededException.class
    })
    ResponseEntity<Map<String, Object>> handleBadUpload(Exception exc) {
        return ResponseEntity.badRequest().body(body(HttpStatus.BAD_REQUEST, exc.getMessage()));
    }

    @ExceptionHandler(BlobStorageException.class)
    ResponseEntity<Map<String, Object>> handleBlobStorage(BlobStorageException exc) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(body(HttpStatus.BAD_GATEWAY, "Attachment storage operation failed"));
    }

    private Map<String, Object> body(HttpStatus status, String message) {
        var body = new LinkedHashMap<String, Object>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("detail", message == null ? status.getReasonPhrase() : message);
        return body;
    }
}
