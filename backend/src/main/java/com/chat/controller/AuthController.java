package com.chat.controller;

import com.chat.entity.User;
import com.chat.service.UserService;
import com.chat.utils.JwtUtil;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostConstruct
    public void init() {
        log.info("========== AuthController CREATED, mapping=/auth/desktop-login ==========");
    }

    @PostMapping("/desktop-login")
    public ResponseEntity<?> desktopLogin(@RequestBody Map<String, String> request) {
        String username = request.get("username");

        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户名不能为空"));
        }

        try {
            User user = userService.desktopLogin(username.trim());
            int tokenVersion = userService.incrementTokenVersion(user.getId());
            String token = jwtUtil.generateToken(user.getId(), user.getUsername(), tokenVersion);
            Map<String, Object> response = new HashMap<>();
            response.put("userId", String.valueOf(user.getId()));
            response.put("username", user.getUsername());
            response.put("avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "");
            response.put("createdAt", user.getCreatedAt());
            response.put("token", token);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
