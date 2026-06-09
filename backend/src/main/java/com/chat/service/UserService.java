package com.chat.service;

import com.chat.entity.User;
import com.chat.exception.BusinessException;
import com.chat.exception.UserBannedException;
import com.chat.repository.UserRepository;
import com.chat.utils.SnowflakeIdGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SnowflakeIdGenerator idGenerator;

    @Transactional
    @CacheEvict(value = {"users", "usersByName"}, allEntries = true)
    public User desktopLogin(String username) {
        Optional<User> existing = userRepository.findByUsername(username);
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.isBanned()) {
                throw new UserBannedException(user.getBannedReason());
            }
            return user;
        }
        User user = new User();
        user.setId(idGenerator.nextId());
        user.setUsername(username);
        user.setCreatedAt(System.currentTimeMillis());
        user.setLastSeen(System.currentTimeMillis());
        return userRepository.save(user);
    }

    @Transactional
    @CacheEvict(value = {"users", "usersByName"}, allEntries = true)
    public int incrementTokenVersion(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("用户不存在"));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
        return user.getTokenVersion();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#userId")
    public Optional<User> findById(Long userId) {
        return userRepository.findById(userId);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "usersByName", key = "#username")
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional
    public void updateLastSeen(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setLastSeen(System.currentTimeMillis());
            userRepository.save(user);
        });
    }
}
