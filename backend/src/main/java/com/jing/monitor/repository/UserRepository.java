package com.jing.monitor.repository;

import com.jing.monitor.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA repository for user account persistence.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> lockByIdForUpdate(@Param("id") UUID id);

    /**
     * Finds a user by normalized email.
     *
     * @param email email address
     * @return optional user
     */
    Optional<User> findByEmail(String email);

    /**
     * Pages users by their number of enabled subscriptions, fewest first; ties are ordered by email.
     *
     * @param pageable page number and size; its sort is ignored
     * @return one page of users
     */
    @Query(value = """
            select u from User u
            left join UserSectionSubscription s on s.user = u and s.enabled = true
            group by u
            order by count(s) asc, u.email asc
            """, countQuery = "select count(u) from User u")
    Page<User> findPageByEnabledSubscriptionsAsc(Pageable pageable);

    /**
     * Pages users by their number of enabled subscriptions, most first; ties are ordered by email.
     *
     * @param pageable page number and size; its sort is ignored
     * @return one page of users
     */
    @Query(value = """
            select u from User u
            left join UserSectionSubscription s on s.user = u and s.enabled = true
            group by u
            order by count(s) desc, u.email asc
            """, countQuery = "select count(u) from User u")
    Page<User> findPageByEnabledSubscriptionsDesc(Pageable pageable);

    @Query("select u.email from User u order by u.email")
    List<String> findBroadcastEmails();

    // Disabled subscriptions deliberately remain eligible for semester reports and recalls.
    @Query("select distinct s.user.email from UserSectionSubscription s where s.section.course.termCode = :termCode")
    List<String> findBroadcastEmailsForTerm(@Param("termCode") String termCode);
}
