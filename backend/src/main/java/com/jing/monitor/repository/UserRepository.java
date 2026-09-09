package com.jing.monitor.repository;

import com.jing.monitor.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * JPA repository for user account persistence.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> lockById(@Param("id") UUID id);

    /**
     * Finds a user by normalized email.
     *
     * @param email email address
     * @return optional user
     */
    Optional<User> findByEmail(String email);

    @Query("select u.email from User u order by u.email")
    List<String> findBroadcastEmails();

    // Disabled subscriptions deliberately remain eligible for semester reports and recalls.
    @Query("select distinct s.user.email from UserSectionSubscription s where s.section.course.termCode = :termCode")
    List<String> findBroadcastEmailsForTerm(@Param("termCode") String termCode);
}
