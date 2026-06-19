package com.jing.monitor.repository;

import com.jing.monitor.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * JPA repository for user account persistence.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    /**
     * Finds a user by normalized email.
     *
     * @param email email address
     * @return optional user
     */
    Optional<User> findByEmail(String email);
}
